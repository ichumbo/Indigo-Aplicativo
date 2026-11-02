<?php

namespace App\Services\Migration;

use InvalidArgumentException;
use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

class SpreadsheetParserService
{
    /**
     * Faz o parsing de arquivo CSV ou XLSX com tratamento robusto de encoding e delimitador.
     */
    public function parseFile(string $filePath, string $originalName): array
    {
        if (!file_exists($filePath)) {
            throw new InvalidArgumentException("Arquivo não encontrado no caminho: {$filePath}");
        }

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if ($extension === 'xlsx') {
            return $this->parseXlsx($filePath);
        }

        if (in_array($extension, ['csv', 'txt', 'tsv'])) {
            return $this->parseCsv($filePath);
        }

        throw new InvalidArgumentException("Formato de arquivo '.{$extension}' não suportado para planilhas.");
    }

    /**
     * Parser nativo e rápido de XLSX via ZipArchive e XML.
     */
    public function parseXlsx(string $filePath): array
    {
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new RuntimeException("Não foi possível abrir o arquivo XLSX como arquivo ZIP válido.");
        }

        // 1. Ler strings compartilhadas (sharedStrings.xml)
        $sharedStrings = [];
        $sharedXmlContent = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedXmlContent !== false) {
            $xml = simplexml_load_string($sharedXmlContent);
            if ($xml !== false) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string) $r->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // 2. Ler primeira planilha (xl/worksheets/sheet1.xml)
        $sheetXmlContent = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXmlContent === false) {
            $zip->close();
            throw new RuntimeException("Não foi possível localizar a planilha principal no arquivo XLSX.");
        }

        $sheetXml = simplexml_load_string($sheetXmlContent);
        $zip->close();

        if ($sheetXml === false || !isset($sheetXml->sheetData->row)) {
            return ['headers' => [], 'rows' => []];
        }

        $rawGrid = [];
        foreach ($sheetXml->sheetData->row as $row) {
            $rowArray = [];
            foreach ($row->c as $cell) {
                $val = (string) $cell->v;
                $type = (string) $cell['t'];

                if ($type === 's') { // string compartilhada
                    $index = intval($val);
                    $cellValue = $sharedStrings[$index] ?? '';
                } elseif ($type === 'inlineStr' && isset($cell->is->t)) {
                    $cellValue = (string) $cell->is->t;
                } else {
                    $cellValue = $val;
                }
                $rowArray[] = trim($cellValue);
            }
            if (!empty(array_filter($rowArray, fn($c) => $c !== ''))) {
                $rawGrid[] = $rowArray;
            }
        }

        if (empty($rawGrid)) {
            return ['headers' => [], 'rows' => []];
        }

        $headers = array_map(fn($h) => strtolower(trim($h)), array_shift($rawGrid));
        $rows = [];

        foreach ($rawGrid as $rowValues) {
            $rowObj = [];
            foreach ($headers as $idx => $header) {
                if ($header !== '') {
                    $rowObj[$header] = $rowValues[$idx] ?? '';
                }
            }
            $rows[] = $rowObj;
        }

        return [
            'headers' => array_values(array_filter($headers)),
            'rows' => $rows,
        ];
    }

    /**
     * Parser inteligente de CSV com autodetecção de delimitador e conversão de encoding para UTF-8.
     */
    public function parseCsv(string $filePath): array
    {
        $raw = file_get_contents($filePath);
        if ($raw === false) {
            throw new RuntimeException("Falha ao ler o arquivo CSV.");
        }

        // Remover BOM UTF-8 se presente
        if (str_starts_with($raw, "\xEF\xBB\xBF")) {
            $raw = substr($raw, 3);
        }

        // Normalizar encoding (ex: ISO-8859-1 / Windows-1252 para UTF-8)
        if (!mb_check_encoding($raw, 'UTF-8')) {
            $converted = mb_convert_encoding($raw, 'UTF-8', 'ISO-8859-1,Windows-1252,ASCII');
            if ($converted !== false) {
                $raw = $converted;
            }
        }

        $firstLine = strtok($raw, "\r\n");
        if ($firstLine === false) {
            return ['headers' => [], 'rows' => []];
        }

        $delimiter = $this->detectDelimiter($firstLine);

        $tempHandle = fopen('php://temp', 'r+');
        fwrite($tempHandle, $raw);
        rewind($tempHandle);

        $headers = [];
        $rows = [];
        $isFirst = true;

        while (($data = fgetcsv($tempHandle, 0, $delimiter)) !== false) {
            // Ignorar linhas vazias
            if (empty(array_filter($data, fn($c) => trim((string)$c) !== ''))) {
                continue;
            }

            if ($isFirst) {
                $headers = array_map(function ($h) {
                    $cleaned = trim((string)$h);
                    // Remove aspas excedentes e normaliza
                    return strtolower(trim($cleaned, "\"' \t\n\r\0\x0B"));
                }, $data);
                $isFirst = false;
                continue;
            }

            $rowObj = [];
            foreach ($headers as $idx => $header) {
                if ($header !== '') {
                    $rowObj[$header] = isset($data[$idx]) ? trim((string)$data[$idx]) : '';
                }
            }
            $rows[] = $rowObj;
        }

        fclose($tempHandle);

        return [
            'headers' => array_values(array_filter($headers)),
            'rows' => $rows,
        ];
    }

    private function detectDelimiter(string $firstLine): string
    {
        $semicolons = substr_count($firstLine, ';');
        $commas = substr_count($firstLine, ',');
        $tabs = substr_count($firstLine, "\t");

        if ($semicolons >= $commas && $semicolons >= $tabs && $semicolons > 0) {
            return ';';
        }

        if ($tabs > $commas && $tabs > 0) {
            return "\t";
        }

        return ',';
    }
}
