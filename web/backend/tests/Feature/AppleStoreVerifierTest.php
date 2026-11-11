<?php

namespace Tests\Feature;

use App\Services\AppleStoreVerifier;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AppleStoreVerifierTest extends TestCase
{
    private array $files = [];

    private mixed $key;

    private array $chain;

    protected function setUp(): void
    {
        parent::setUp();
        $config = $this->file("[req]\ndistinguished_name=dn\n[dn]\n[root]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n[intermediate]\nbasicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=ASN1:NULL\n[leaf]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n1.2.840.113635.100.6.11.1=ASN1:NULL\n");
        $options = ['digest_alg' => 'sha256', 'private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1', 'config' => $config];
        $certs = [];
        $previousKey = null;
        $previousCert = null;
        foreach (['root', 'intermediate', 'leaf'] as $name) {
            $key = openssl_pkey_new($options);
            $csr = openssl_csr_new(['commonName' => $name], $key, $options);
            $cert = openssl_csr_sign($csr, $previousCert, $previousKey ?? $key, 2, $options + ['x509_extensions' => $name]);
            openssl_x509_export($cert, $pem);
            $certs[] = preg_replace('/-----[^-]+-----|\s/', '', $pem);
            if ($name === 'root') {
                $root = $pem;
            }
            $previousKey = $key;
            $previousCert = $cert;
        }
        $this->key = $key;
        $this->chain = array_reverse($certs);
        openssl_pkey_export($key, $private);
        config(['services.apple' => ['issuer_id' => 'issuer', 'key_id' => 'key',
            'bundle_id' => 'com.dragoncorp.app', 'private_key_path' => $this->file($private),
            'root_certificate_path' => $this->file($root)]]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        foreach ($this->files as $file) {
            unlink($file);
        }
        parent::tearDown();
    }

    private function file(string $contents): string
    {
        $file = tempnam(sys_get_temp_dir(), 'apple-test-');
        file_put_contents($file, $contents);
        $this->files[] = $file;

        return $file;
    }

    private function claims(array $overrides = []): array
    {
        return array_replace(['bundleId' => 'com.dragoncorp.app', 'environment' => 'Production',
            'transactionId' => '100000001', 'originalTransactionId' => '100000000',
            'productId' => 'com.dragoncorp.pro.monthly', 'type' => 'Auto-Renewable Subscription',
            'purchaseDate' => now()->subMinute()->getTimestampMs(),
            'expiresDate' => now()->addMinutes(4)->getTimestampMs()], $overrides);
    }

    private function signed(array $claims): string
    {
        openssl_pkey_export($this->key, $private);

        return JWT::encode($claims, $private, 'ES256', null, ['x5c' => $this->chain]);
    }

    public function test_sandbox_fallback_verifies_signature_and_dates(): void
    {
        $claims = $this->claims(['environment' => 'Sandbox']);
        Http::fake(['api.storekit.apple.com/*' => Http::response(['errorCode' => 4040010], 404),
            'api.storekit-sandbox.apple.com/*' => Http::response(['signedTransactionInfo' => $this->signed($claims)])]);
        $this->assertSame($claims, app(AppleStoreVerifier::class)->verify('100000001', 'com.dragoncorp.pro.monthly'));
        Http::assertSentCount(2);
    }

    public function test_expired_revoked_or_wrong_app_transactions_are_rejected(): void
    {
        foreach ([['expiresDate' => 1], ['revocationDate' => 1], ['bundleId' => 'another.app'], ['productId' => 'another.product']] as $overrides) {
            Http::fake(['*' => Http::response(['signedTransactionInfo' => $this->signed($this->claims($overrides))])]);
            try {
                app(AppleStoreVerifier::class)->verify('100000001', 'com.dragoncorp.pro.monthly');
                $this->fail('Invalid transactions must fail closed.');
            } catch (\InvalidArgumentException $e) {
                $this->assertNotEmpty($e->getMessage());
            }
        }
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $parts = explode('.', $this->signed($this->claims()));
        $parts[1] = JWT::urlsafeB64Encode(json_encode($this->claims(['expiresDate' => 9999999999999])));
        $this->expectException(\RuntimeException::class);
        app(AppleStoreVerifier::class)->decodeSignedPayload(implode('.', $parts));
    }

    public function test_untrusted_root_is_rejected(): void
    {
        $signed = $this->signed($this->claims());
        config(['services.apple.root_certificate_path' => $this->file('Untrusted root')]);
        $this->expectException(\RuntimeException::class);
        app(AppleStoreVerifier::class)->decodeSignedPayload($signed);
    }

    public function test_authentication_errors_never_trigger_sandbox_fallback(): void
    {
        Http::fake(['*' => Http::response([], 401)]);
        try {
            app(AppleStoreVerifier::class)->verify('100000001', 'com.dragoncorp.pro.monthly');
            $this->fail('Must fail closed.');
        } catch (\RuntimeException) {
            Http::assertSentCount(1);
        }
    }
}
