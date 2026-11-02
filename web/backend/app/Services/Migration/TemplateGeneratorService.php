<?php

namespace App\Services\Migration;

use InvalidArgumentException;

class TemplateGeneratorService
{
    public function getAvailableTemplates(): array
    {
        return [
            'students' => [
                'filename' => 'modelo_alunos.csv',
                'title' => 'Modelo de Cadastro de Alunos',
                'description' => 'Importe contatos, datas de nascimento, objetivos e observações dos seus alunos.',
                'columns' => [
                    'id_externo' => 'Identificador original (opcional)',
                    'nome_completo' => 'Nome completo do aluno (obrigatório)',
                    'email' => 'E-mail para convite (opcional/recomendado)',
                    'telefone' => 'Celular com DDD (opcional)',
                    'data_nascimento' => 'Formato DD/MM/AAAA ou AAAA-MM-DD',
                    'genero' => 'Masculino, Feminino ou Outro',
                    'objetivo_principal' => 'Objetivo (ex: Hipertrofia, Emagrecimento)',
                    'objetivos_secundarios' => 'Objetivos separados por vírgula',
                    'profissao' => 'Profissão do aluno',
                    'endereco' => 'Cidade, Estado ou endereço completo',
                    'observacoes_administrativas' => 'Notas privadas do personal',
                    'data_inicio' => 'Data de início na consultoria',
                ],
            ],
            'workouts' => [
                'filename' => 'modelo_treinos.csv',
                'title' => 'Modelo de Treinos e Prescrições',
                'description' => 'Importe rotinas, divisões (Treino A, B, C), exercícios, séries, repetições e cargas.',
                'columns' => [
                    'id_aluno_externo' => 'Identificador do aluno na planilha de alunos (opcional)',
                    'nome_aluno' => 'Nome do aluno para vincular a ficha',
                    'nome_treino' => 'Título do plano (ex: Hipertrofia Fase 1)',
                    'nome_sessao' => 'Divisão (ex: Peito e Tríceps)',
                    'identificador_sessao' => 'Letra da divisão (ex: Treino A, Treino B)',
                    'exercicio' => 'Nome do exercício',
                    'grupo_muscular' => 'Peitoral, Costas, Pernas, etc.',
                    'ordem_exercicio' => 'Ordem de execução (1, 2, 3...)',
                    'series' => 'Número de séries planejadas (ex: 3, 4)',
                    'repeticoes' => 'Repetições (ex: 10, 12, 8-12)',
                    'carga_kg' => 'Carga em kg (ex: 20, 35.5)',
                    'descanso_segundos' => 'Tempo de descanso em segundos (ex: 60, 90)',
                    'cadencia' => 'Cadência (ex: 2-0-2-0)',
                    'observacoes' => 'Recomendações técnicas ou método (ex: Drop-set na última)',
                    'combinacao' => 'Bi-set, Tri-set ou isolado',
                ],
            ],
            'assessments' => [
                'filename' => 'modelo_avaliacoes.csv',
                'title' => 'Modelo de Avaliações Físicas Históricas',
                'description' => 'Importe aferições corporais passadas com preservação dos dados originais.',
                'columns' => [
                    'id_aluno_externo' => 'Identificador do aluno',
                    'nome_aluno' => 'Nome do aluno',
                    'data_avaliacao' => 'Data da realização (DD/MM/AAAA)',
                    'protocolo' => 'Nome do protocolo (ex: Pollock 3 Dobras, Bioimpedância)',
                    'peso_kg' => 'Peso em kg',
                    'altura_cm' => 'Altura em centímetros',
                    'percentual_gordura' => 'Percentual de gordura original (%)',
                    'massa_gorda_kg' => 'Massa gorda original em kg',
                    'massa_magra_kg' => 'Massa magra original em kg',
                    'dobra_peitoral' => 'Dobra peitoral (mm)',
                    'dobra_abdominal' => 'Dobra abdominal (mm)',
                    'dobra_coxa' => 'Dobra coxa (mm)',
                    'dobra_triceps' => 'Dobra tríceps (mm)',
                    'dobra_subescapular' => 'Dobra subescapular (mm)',
                    'dobra_suprailiaca' => 'Dobra suprailíaca (mm)',
                    'dobra_axilar_media' => 'Dobra axilar média (mm)',
                    'perimetro_braco_relaxado' => 'Perímetro braço relaxado (cm)',
                    'perimetro_cintura' => 'Perímetro cintura (cm)',
                    'perimetro_quadril' => 'Perímetro quadril (cm)',
                    'observacoes' => 'Comentários ou laudo da avaliação',
                ],
            ],
            'measurements' => [
                'filename' => 'modelo_medidas.csv',
                'title' => 'Modelo de Perímetros e Circunferências',
                'description' => 'Aferições de perímetros corporais e histórico biométrico.',
                'columns' => [
                    'nome_aluno' => 'Nome do aluno',
                    'data' => 'Data da aferição',
                    'peso' => 'Peso (kg)',
                    'braco_direito' => 'Braço D (cm)',
                    'braco_esquerdo' => 'Braço E (cm)',
                    'coxa_direita' => 'Coxa D (cm)',
                    'coxa_esquerda' => 'Coxa E (cm)',
                    'cintura' => 'Cintura (cm)',
                    'abdomen' => 'Abdômen (cm)',
                    'quadril' => 'Quadril (cm)',
                ],
            ],
            'documents' => [
                'filename' => 'modelo_documentos.csv',
                'title' => 'Mapeamento de Documentos e Fichas PDF',
                'description' => 'Mapeamento para associar arquivos PDF avulsos aos alunos corretos.',
                'columns' => [
                    'nome_arquivo' => 'Nome exato do arquivo (ex: anamnese_pedro.pdf)',
                    'nome_aluno' => 'Nome do aluno correspondente',
                    'categoria' => 'anamnese, avaliacao, treino, laudo_medico, outro',
                    'data_documento' => 'Data original do documento',
                    'observacao' => 'Notas sobre o conteúdo do documento',
                ],
            ],
            'photos' => [
                'filename' => 'modelo_imagens.csv',
                'title' => 'Mapeamento de Fotos Posturais e Evolução',
                'description' => 'Guia para envio de fotos organizadas por aluno.',
                'columns' => [
                    'nome_arquivo' => 'Nome do arquivo de imagem (ex: frente_marcos.jpg)',
                    'nome_aluno' => 'Nome do aluno',
                    'tipo_foto' => 'frente, costas, lateral_direita, lateral_esquerda, perfil',
                    'data_foto' => 'Data da foto',
                ],
            ],
        ];
    }

    public function generateCsv(string $type): string
    {
        $templates = $this->getAvailableTemplates();
        if (!isset($templates[$type])) {
            throw new InvalidArgumentException("Tipo de modelo '{$type}' não suportado.");
        }

        $headers = array_keys($templates[$type]['columns']);
        $rows = $this->getExampleRows($type);

        $output = fopen('php://temp', 'r+');
        // Escreve UTF-8 BOM para garantir correta abertura no Excel brasileiro
        fputs($output, "\xEF\xBB\xBF");
        fputcsv($output, $headers, ';');

        foreach ($rows as $row) {
            fputcsv($output, $row, ';');
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }

    private function getExampleRows(string $type): array
    {
        switch ($type) {
            case 'students':
                return [
                    [
                        'ALU-001',
                        'Carlos Eduardo Silva',
                        'carlos.silva@exemplo.com.br',
                        '(11) 98765-4321',
                        '15/05/1992',
                        'Masculino',
                        'Hipertrofia e Condicionamento',
                        'Ganho de força, Postura',
                        'Engenheiro de Software',
                        'São Paulo, SP',
                        'Aluno frequenta academia há 2 anos, sem lesões.',
                        '01/02/2026',
                    ],
                    [
                        'ALU-002',
                        'Mariana Fernandes Costa',
                        'mariana.costa@exemplo.com.br',
                        '(21) 99887-6655',
                        '28/11/1995',
                        'Feminino',
                        'Emagrecimento Saudável',
                        'Definição muscular',
                        'Advogada',
                        'Rio de Janeiro, RJ',
                        'Relata desconforto leve no joelho esquerdo.',
                        '10/01/2026',
                    ],
                ];
            case 'workouts':
                return [
                    [
                        'ALU-001',
                        'Carlos Eduardo Silva',
                        'Hipertrofia ABC - Fase 1',
                        'Peito e Tríceps',
                        'Treino A',
                        'Supino Reto',
                        'Peitoral',
                        '1',
                        '4',
                        '8-10',
                        '30.0',
                        '90',
                        '2-0-2-0',
                        'Barra olímpica; aquecer com 50% antes',
                        'Isolado',
                    ],
                    [
                        'ALU-001',
                        'Carlos Eduardo Silva',
                        'Hipertrofia ABC - Fase 1',
                        'Peito e Tríceps',
                        'Treino A',
                        'Crucifixo Inclinado com Halteres',
                        'Peitoral',
                        '2',
                        '3',
                        '12',
                        '14.0',
                        '60',
                        '3-0-1-0',
                        'Foco no pico de contração',
                        'Isolado',
                    ],
                    [
                        'ALU-001',
                        'Carlos Eduardo Silva',
                        'Hipertrofia ABC - Fase 1',
                        'Peito e Tríceps',
                        'Treino A',
                        'Tríceps Corda no Pulley',
                        'Tríceps',
                        '3',
                        '4',
                        '12-15',
                        '25.0',
                        '60',
                        '2-0-1-1',
                        'Abrir bem a corda no final',
                        'Isolado',
                    ],
                ];
            case 'assessments':
                return [
                    [
                        'ALU-001',
                        'Carlos Eduardo Silva',
                        '15/01/2026',
                        'Jackson & Pollock 3 Dobras',
                        '78.5',
                        '178.0',
                        '14.8',
                        '11.6',
                        '66.9',
                        '10.5',
                        '16.0',
                        '13.0',
                        '',
                        '',
                        '',
                        '',
                        '36.5',
                        '81.0',
                        '98.5',
                        'Avaliação física inicial importada da consultoria anterior.',
                    ],
                ];
            case 'measurements':
                return [
                    [
                        'Carlos Eduardo Silva',
                        '15/01/2026',
                        '78.5',
                        '36.5',
                        '36.0',
                        '58.0',
                        '57.5',
                        '81.0',
                        '84.0',
                        '98.5',
                    ],
                ];
            case 'documents':
                return [
                    [
                        'anamnese_carlos.pdf',
                        'Carlos Eduardo Silva',
                        'anamnese',
                        '10/01/2026',
                        'Ficha médica preenchida no MFIT',
                    ],
                ];
            case 'photos':
                return [
                    [
                        'carlos_frente_jan2026.jpg',
                        'Carlos Eduardo Silva',
                        'frente',
                        '15/01/2026',
                    ],
                ];
            default:
                return [];
        }
    }

    public function getLegalExportGuides(): array
    {
        return [
            'mfit' => [
                'name' => 'MFIT Personal',
                'description' => 'Como obter legalmente seus dados de alunos, treinos e avaliações no MFIT.',
                'steps' => [
                    'Acesse sua conta no painel web do MFIT Personal através do navegador.',
                    'Na seção de Alunos, selecione a opção de exportação de relatórios ou lista de alunos.',
                    'Para treinos e avaliações, gere o relatório consolidado em PDF ou planilha disponível.',
                    'Salve os arquivos em seu computador (em formato Excel, CSV ou PDF).',
                    'Faça o upload diretamente aqui na Central de Migração do DragonCorp.',
                ],
                'legal_disclaimer' => 'Em conformidade com a LGPD (Lei 13.709/2018), o personal trainer tem o direito à portabilidade e acesso aos dados de seus clientes dos quais é o controlador/operador legítimo. O DragonCorp não solicita nem armazena senhas de outros aplicativos.',
            ],
            'avaliacao_fisica_pro' => [
                'name' => 'Avaliação Física PRO',
                'description' => 'Como exportar avaliações, dobras e perímetros do Avaliação Física PRO.',
                'steps' => [
                    'Abra o aplicativo ou sistema Avaliação Física PRO.',
                    'No menu do aluno ou histórico geral de avaliações, acerte a opção "Exportar Relatório" ou "Gerar PDF Completo".',
                    'Selecione o formato PDF ou planilha compatível.',
                    'Se possuir imagens ou gráficos, utilize o recurso de salvar em pasta ou arquivo ZIP.',
                    'Envie os PDFs e planilhas gerados para a Central de Migração do DragonCorp.',
                ],
                'legal_disclaimer' => 'O DragonCorp preserva fielmente todos os protocolos originais e dados históricos brutos, sem recalcular resultados anteriores com fórmulas divergentes.',
            ],
            'spreadsheet' => [
                'name' => 'Planilhas Excel ou CSV Próprias',
                'description' => 'Caso utilize planilhas pessoais do Excel ou Google Sheets.',
                'steps' => [
                    'Baixe nossos modelos oficiais (modelo_alunos.csv ou modelo_treinos.csv) acima.',
                    'Copie e cole seus dados existentes nas colunas correspondentes ou mantenha suas colunas.',
                    'Nosso assistente inteligente permite mapear qualquer cabeçalho de coluna durante o envio.',
                    'Salve como .xlsx ou .csv e realize o upload.',
                ],
                'legal_disclaimer' => 'A correspondência de colunas é 100% revisável e reversível antes de qualquer gravação definitiva.',
            ],
        ];
    }
}
