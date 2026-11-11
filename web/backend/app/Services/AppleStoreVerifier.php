<?php

namespace App\Services;

use Carbon\Carbon;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

class AppleStoreVerifier
{
    /** @return array<string, mixed> */
    public function verify(string $transactionId, string $productId): array
    {
        if (! preg_match('/^[0-9]+$/', $transactionId)) {
            throw new InvalidArgumentException('Identificador de transação Apple inválido.');
        }

        $keyPath = config('services.apple.private_key_path');
        $issuer = config('services.apple.issuer_id');
        $keyId = config('services.apple.key_id');
        $bundleId = config('services.apple.bundle_id');
        if (! $keyPath || ! is_readable($keyPath) || ! $issuer || ! $keyId || ! $bundleId) {
            throw new RuntimeException('Credenciais da App Store Server API não configuradas.');
        }
        $token = JWT::encode([
            'iss' => $issuer, 'iat' => time(), 'exp' => time() + 300,
            'aud' => 'appstoreconnect-v1', 'bid' => $bundleId,
        ], file_get_contents($keyPath), 'ES256', $keyId);

        foreach (['production' => 'https://api.storekit.apple.com', 'sandbox' => 'https://api.storekit-sandbox.apple.com'] as $environment => $base) {
            $response = Http::withToken($token)->acceptJson()->connectTimeout(5)->timeout(15)
                ->get($base.'/inApps/v1/transactions/'.$transactionId);
            if ($environment === 'production' && $response->json('errorCode') === 4040010) {
                continue;
            }
            if (! $response->successful()) {
                if ($response->json('errorCode') === 4040010) {
                    throw new InvalidArgumentException('Transação não encontrada na App Store.');
                }
                throw new RuntimeException('Falha ao consultar a App Store Server API.');
            }
            $transaction = $this->decodeSignedPayload((string) $response->json('signedTransactionInfo'));
            if (($transaction['bundleId'] ?? null) !== $bundleId
                || ($transaction['environment'] ?? null) !== ucfirst($environment)
                || ($transaction['transactionId'] ?? null) !== $transactionId
                || ($transaction['productId'] ?? null) !== $productId
                || ($transaction['type'] ?? null) !== 'Auto-Renewable Subscription'
                || empty($transaction['originalTransactionId'])
                || empty($transaction['purchaseDate']) || empty($transaction['expiresDate'])) {
                throw new InvalidArgumentException('Dados da transação Apple não correspondem à assinatura.');
            }
            if (! empty($transaction['revocationDate']) || $transaction['expiresDate'] <= Carbon::now()->getTimestampMs()) {
                throw new InvalidArgumentException('Assinatura Apple expirada ou revogada.');
            }

            return $transaction;
        }
        throw new InvalidArgumentException('Transação não encontrada na App Store.');
    }

    /** @return array<string, mixed> */
    public function decodeSignedPayload(string $signedPayload): array
    {
        try {
            $parts = explode('.', $signedPayload);
            if (count($parts) !== 3) {
                throw new RuntimeException('JWS inválido.');
            }
            $header = json_decode(JWT::urlsafeB64Decode($parts[0]), true, 16, JSON_THROW_ON_ERROR);
            $chain = $header['x5c'] ?? [];
            if (($header['alg'] ?? '') !== 'ES256' || count($chain) !== 3) {
                throw new RuntimeException('Cadeia JWS inválida.');
            }
            $certificates = array_map(fn (string $cert): string => "-----BEGIN CERTIFICATE-----\n".chunk_split($cert, 64, "\n")."-----END CERTIFICATE-----\n", $chain);
            $rootPath = config('services.apple.root_certificate_path');
            if (! $rootPath || ! is_readable($rootPath)) {
                throw new RuntimeException('Certificado raiz Apple não configurado.');
            }
            $leaf = openssl_x509_parse($certificates[0]);
            $intermediate = openssl_x509_parse($certificates[1]);
            if (! isset($leaf['extensions']['1.2.840.113635.100.6.11.1'])
                || ! isset($intermediate['extensions']['1.2.840.113635.100.6.2.1'])) {
                throw new RuntimeException('Certificado não autorizado para assinar transações Apple.');
            }
            $chainFile = tempnam(sys_get_temp_dir(), 'apple-chain-');
            if ($chainFile === false) {
                throw new RuntimeException('Não foi possível verificar a cadeia Apple.');
            }
            try {
                file_put_contents($chainFile, $certificates[1]);
                if (openssl_x509_checkpurpose($certificates[0], X509_PURPOSE_ANY, [$rootPath], $chainFile) !== true) {
                    throw new RuntimeException('Cadeia Apple não confiável.');
                }
            } finally {
                unlink($chainFile);
            }
            $key = openssl_pkey_get_public($certificates[0]);
            if (! $key) {
                throw new RuntimeException('Chave Apple inválida.');
            }

            return (array) JWT::decode($signedPayload, new Key($key, 'ES256'));
        } catch (\Throwable $e) {
            throw new RuntimeException('Falha na verificação da assinatura Apple.', 0, $e);
        }
    }
}
