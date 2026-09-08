"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SAMPLE_CONCONI_PROTOCOL = void 0;
exports.listConconiProtocols = listConconiProtocols;
exports.getActiveConconiProtocolForStudent = getActiveConconiProtocolForStudent;
exports.saveConconiProtocol = saveConconiProtocol;
exports.deleteConconiProtocol = deleteConconiProtocol;
exports.generateConconiProtocolPdfHtml = generateConconiProtocolPdfHtml;
exports.shareConconiProtocolAsPdf = shareConconiProtocolAsPdf;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const Print = __importStar(require("expo-print"));
const Sharing = __importStar(require("expo-sharing"));
const react_native_1 = require("react-native");
const trainer_branding_store_1 = require("@/services/trainer-branding-store");
const STORAGE_KEY_PREFIX = "@dragoncorp/conconi_protocols_v1:";
exports.DEFAULT_SAMPLE_CONCONI_PROTOCOL = {
    id: "conconi-proto-sample",
    trainerId: "trainer",
    studentId: "student-1",
    studentName: "Charles Nóbrega",
    protocolDate: new Date().toISOString().slice(0, 10),
    title: "PROTOCOLO AERÓBIO",
    warmupText: "5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)",
    conconiTestResult: {
        environment: "esteira",
        stages: [
            { stage: 1, speedKmh: 4.0, heartRateBpm: 108 },
            { stage: 2, speedKmh: 4.5, heartRateBpm: 118 },
            { stage: 3, speedKmh: 5.0, heartRateBpm: 128 },
            { stage: 4, speedKmh: 5.5, heartRateBpm: 138 },
            { stage: 5, speedKmh: 6.0, heartRateBpm: 148 },
            { stage: 6, speedKmh: 6.5, heartRateBpm: 156 },
            { stage: 7, speedKmh: 7.0, heartRateBpm: 162 },
            { stage: 8, speedKmh: 7.5, heartRateBpm: 167 },
            { stage: 9, speedKmh: 8.0, heartRateBpm: 170 },
        ],
        deflectionHeartRate: 156,
        deflectionSpeedKmh: 6.5,
        maxHeartRate: 172,
        vo2MaxEstimate: 42.5,
        zones: {
            z1Recovery: "105 a 125 bpm (< 5.0 km/h)",
            z2Aerobic: "126 a 145 bpm (5.0 a 6.0 km/h)",
            z3Threshold: "146 a 156 bpm (6.0 a 6.5 km/h)",
            z4Vo2Max: "157 a 166 bpm (6.6 a 7.5 km/h)",
            z5Anaerobic: "> 167 bpm (> 7.5 km/h)",
        },
    },
    daysPrescription: [
        {
            id: "dp-1",
            dayOfWeek: "Segunda",
            intervalsCount: 4,
            activeDurationMinutes: 3,
            activeSpeedKmh: 5.6,
            pauseDurationMinutes: 2,
            pauseSpeedKmh: 3.0,
            totalVolumeMinutes: 20,
            description: "4x 3 minutos ativos a 5.6 km/h e 2 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
        },
        {
            id: "dp-2",
            dayOfWeek: "Quarta",
            intervalsCount: 4,
            activeDurationMinutes: 2,
            activeSpeedKmh: 6.0,
            pauseDurationMinutes: 3,
            pauseSpeedKmh: 3.0,
            totalVolumeMinutes: 20,
            description: "4x 2 minutos ativos a 6.0 km/h e 3 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
        },
        {
            id: "dp-3",
            dayOfWeek: "Sexta",
            continuousMinutes: 20,
            continuousSpeedKmh: 5.0,
            totalVolumeMinutes: 20,
            description: "20 minutos aeróbio contínuo moderado a 5.0 km/h (serão 20 minutos contínuos nessa faixa de velocidade).",
        },
    ],
    generalNotes: "O protocolo será atualizado a cada 2 semanas se forem feitos 2 vezes cada treino.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};
async function listConconiProtocols(trainerId = "trainer", studentId) {
    try {
        const raw = await async_storage_1.default.getItem(`${STORAGE_KEY_PREFIX}${trainerId}`);
        if (!raw) {
            if (trainerId === "trainer" || trainerId === "demo-trainer") {
                return studentId ? [exports.DEFAULT_SAMPLE_CONCONI_PROTOCOL].filter((p) => p.studentId === studentId) : [exports.DEFAULT_SAMPLE_CONCONI_PROTOCOL];
            }
            return [];
        }
        const list = JSON.parse(raw);
        if (studentId) {
            return list.filter((p) => p.studentId === studentId);
        }
        return list;
    }
    catch {
        return [];
    }
}
async function getActiveConconiProtocolForStudent(studentId, trainerId = "trainer") {
    try {
        const protocols = await listConconiProtocols(trainerId, studentId);
        if (protocols.length === 0) {
            // If student is student-1 or demo, return sample
            if (studentId === "student-1" || studentId === "demo-student" || studentId === "user-student-1") {
                return exports.DEFAULT_SAMPLE_CONCONI_PROTOCOL;
            }
            return null;
        }
        // Return the most recently updated protocol
        return protocols[0];
    }
    catch {
        return null;
    }
}
async function saveConconiProtocol(protocol) {
    const list = await listConconiProtocols(protocol.trainerId);
    const filtered = list.filter((p) => p.id !== protocol.id);
    const updatedList = [protocol, ...filtered];
    await async_storage_1.default.setItem(`${STORAGE_KEY_PREFIX}${protocol.trainerId}`, JSON.stringify(updatedList));
}
async function deleteConconiProtocol(id, trainerId = "trainer") {
    const list = await listConconiProtocols(trainerId);
    const updatedList = list.filter((p) => p.id !== id);
    await async_storage_1.default.setItem(`${STORAGE_KEY_PREFIX}${trainerId}`, JSON.stringify(updatedList));
}
function getInitials(name) {
    const clean = (name || "").trim();
    if (!clean)
        return "A";
    const parts = clean.split(/\s+/);
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function formatBrDate(dateStr) {
    if (!dateStr)
        return "-";
    const clean = dateStr.trim();
    if (clean.length === 10 && clean.includes("-")) {
        const [y, m, d] = clean.split("-");
        return `${d}/${m}/${y}`;
    }
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }
    return dateStr;
}
async function generateConconiProtocolPdfHtml(protocol, trainerId = "trainer") {
    const branding = await (0, trainer_branding_store_1.getTrainerBranding)(trainerId);
    const primaryColor = branding.primaryColor || "#D90000";
    const trainerName = branding.displayName || "Personal DragonCorp";
    const businessName = branding.businessName || "DragonCorp";
    const professionalId = branding.professionalId || "CREF 000000-G/SP";
    const trainerEmail = branding.email || "";
    const trainerPhone = branding.phone || "";
    const trainerAvatar = branding.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";
    const trainerTagline = branding.tagline || "Treinamento Cardiorrespiratório & Performance";
    const studentInitials = getInitials(protocol.studentName);
    const studentAvatarUrl = protocol.studentAvatar || "";
    const formattedProtocolDate = formatBrDate(protocol.protocolDate);
    const formattedEmissionDate = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    const daysHtml = protocol.daysPrescription
        .map((day) => {
        const isInterval = (day.intervalsCount ?? 0) > 0 || (day.pauseDurationMinutes ?? 0) > 0;
        return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; padding: 16px; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: ${primaryColor}; color: #ffffff; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 6px;">
                ${day.dayOfWeek}
              </span>
              <span style="font-size: 14px; font-weight: 800; color: #0f172a;">Prescrição da Sessão</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #f1f5f9; color: #64748b; font-size: 11.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ⏱️ ${day.totalVolumeMinutes} min
              </span>
              <span style="background: ${isInterval ? "#fef2f2" : "#eff6ff"}; color: ${isInterval ? primaryColor : "#1d4ed8"}; font-size: 11.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid ${isInterval ? "#fee2e2" : "#bfdbfe"};">
                ${isInterval ? "Intervalado / HIIT" : "Contínuo"}
              </span>
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 10px; font-size: 12px; line-height: 1.5; color: #334155;">
            <strong>Prescrição & Estrutura:</strong><br/>
            ${day.description}
          </div>

          <div style="display: grid; grid-template-columns: repeat(${isInterval ? 4 : 2}, 1fr); gap: 8px; font-size: 11px; text-align: center;">
            ${isInterval
            ? `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                  <div style="color: #64748b; font-size: 9.5px; font-weight: 700;">Tiros / Séries</div>
                  <strong style="color: #0f172a;">${day.intervalsCount || "-"}x</strong>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                  <div style="color: #64748b; font-size: 9.5px; font-weight: 700;">Duração do Tiro</div>
                  <strong style="color: #0f172a;">${day.activeDurationMinutes ? `${day.activeDurationMinutes} min` : "-"}</strong>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                  <div style="color: #64748b; font-size: 9.5px; font-weight: 700;">Velocidade Alvo</div>
                  <strong style="color: ${primaryColor};">${day.activeSpeedKmh ? `${day.activeSpeedKmh} km/h` : "-"}</strong>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                  <div style="color: #64748b; font-size: 9.5px; font-weight: 700;">Pausa / Recuperação</div>
                  <strong style="color: #0f172a;">${day.pauseDurationMinutes ? `${day.pauseDurationMinutes} min @ ${day.pauseSpeedKmh || 5} km/h` : "-"}</strong>
                </div>
              `
            : `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                  <div style="color: #64748b; font-size: 10px; font-weight: 700;">Tempo Contínuo</div>
                  <strong style="color: #0f172a; font-size: 13px;">${day.continuousMinutes || day.totalVolumeMinutes} min</strong>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                  <div style="color: #64748b; font-size: 10px; font-weight: 700;">Velocidade Constante</div>
                  <strong style="color: ${primaryColor}; font-size: 13px;">${day.continuousSpeedKmh ? `${day.continuousSpeedKmh} km/h` : "Ritmo Z2/Z3"}</strong>
                </div>
              `}
          </div>
        </div>
      `;
    })
        .join("");
    const testResultHtml = protocol.conconiTestResult
        ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; page-break-inside: avoid;">
        <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 Parâmetros Fisiológicos Obtidos (Teste de Conconi em ${protocol.conconiTestResult.environment.toUpperCase()}):
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
          <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="color: #64748b; font-size: 10.5px; font-weight: 700;">FC no Limiar (LAN)</div>
            <strong style="color: ${primaryColor}; font-size: 15px; font-weight: 900;">${protocol.conconiTestResult.deflectionHeartRate || 158} bpm</strong>
          </div>
          <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="color: #64748b; font-size: 10.5px; font-weight: 700;">Velocidade no Limiar</div>
            <strong style="color: ${primaryColor}; font-size: 15px; font-weight: 900;">${protocol.conconiTestResult.deflectionSpeedKmh || 11.5} km/h</strong>
          </div>
          <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="color: #64748b; font-size: 10.5px; font-weight: 700;">FC Máxima</div>
            <strong style="color: #0f172a; font-size: 15px; font-weight: 900;">${protocol.conconiTestResult.maxHeartRate || 172} bpm</strong>
          </div>
          <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="color: #64748b; font-size: 10.5px; font-weight: 700;">VO2 Máx Estimado</div>
            <strong style="color: #0f172a; font-size: 15px; font-weight: 900;">${protocol.conconiTestResult.vo2MaxEstimate || 42.5} ml/kg/min</strong>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 11.5px; font-weight: 900; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Zonas de Treinamento Prescritas:</div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 10.5px;">
            <div style="border-left: 3px solid #10B981; padding-left: 6px;"><strong>Z1:</strong><br/><span style="color: #475569; font-weight: 700;">${protocol.conconiTestResult.zones.z1Recovery}</span></div>
            <div style="border-left: 3px solid #3B82F6; padding-left: 6px;"><strong>Z2:</strong><br/><span style="color: #475569; font-weight: 700;">${protocol.conconiTestResult.zones.z2Aerobic}</span></div>
            <div style="border-left: 3px solid #F59E0B; padding-left: 6px;"><strong>Z3:</strong><br/><span style="color: #475569; font-weight: 700;">${protocol.conconiTestResult.zones.z3Threshold}</span></div>
            <div style="border-left: 3px solid #EA580C; padding-left: 6px;"><strong>Z4:</strong><br/><span style="color: #475569; font-weight: 700;">${protocol.conconiTestResult.zones.z4Vo2Max}</span></div>
            <div style="border-left: 3px solid #EF4444; padding-left: 6px;"><strong>Z5:</strong><br/><span style="color: #475569; font-weight: 700;">${protocol.conconiTestResult.zones.z5Anaerobic}</span></div>
          </div>
        </div>
      </div>
    `
        : "";
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${protocol.title} - ${protocol.studentName}</title>
        <style>
          @page {
            margin: 14mm 12mm 14mm 12mm;
            size: A4 portrait;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          .pdf-wrapper {
            width: 100%;
            padding: 2px 4px;
          }
        </style>
      </head>
      <body>
        <div class="pdf-wrapper">
          <!-- HEADER DO PERSONAL & MARCA -->
          <header style="border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${trainerAvatar}" alt="Foto Personal" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
              <div>
                <div style="font-size: 11px; font-weight: 900; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.6px;">${businessName}</div>
                <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px;">${trainerName}</h1>
                <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">${professionalId} • ${trainerTagline}</div>
              </div>
            </div>
            <div style="text-align: right; font-size: 11.5px; color: #475569; line-height: 1.5;">
              ${trainerPhone ? `<div><strong>WhatsApp:</strong> ${trainerPhone}</div>` : ""}
              ${trainerEmail ? `<div><strong>E-mail:</strong> ${trainerEmail}</div>` : ""}
              <div style="color: #94a3b8; font-size: 10px; margin-top: 4px; font-weight: 600;">Prescrição emitida em ${formattedEmissionDate}</div>
            </div>
          </header>

          <!-- BANNER DE IDENTIFICAÇÃO DO ALUNO & PROTOCOLO -->
          <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 22px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${studentAvatarUrl
        ? `<img src="${studentAvatarUrl}" alt="${protocol.studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
        : `<div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #800000); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: 900; border: 2px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${studentInitials}</div>`}
                <div>
                  <span style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">ALUNO PRESCRITO</span>
                  <h2 style="margin: 2px 0 0 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${protocol.studentName}</h2>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="background: ${primaryColor}; color: #ffffff; font-size: 12px; font-weight: 900; padding: 5px 12px; border-radius: 20px; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                  ${protocol.title}
                </span>
              </div>
            </div>

            <div style="display: flex; gap: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px;">
              <div><span style="color: #64748b; font-weight: 700;">Data da Prescrição:</span> <strong style="color: #0f172a;">${formattedProtocolDate}</strong></div>
              <div><span style="color: #64748b; font-weight: 700;">Sessões Semanais:</span> <strong style="color: #0f172a;">${protocol.daysPrescription.length} dias programados</strong></div>
            </div>
          </section>

          <!-- LAUDO DO TESTE DE CONCONI -->
          ${testResultHtml}

          <!-- AQUECIMENTO EM DESTAQUE -->
          <section style="background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid ${primaryColor}; border-radius: 10px; padding: 14px 16px; margin-bottom: 22px; page-break-inside: avoid;">
            <div style="font-size: 11px; font-weight: 900; color: #991b1b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px;">
              Aquecimento Obrigatório
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #b91c1c; line-height: 1.5;">
              ${protocol.warmupText}
            </div>
          </section>

          <!-- PRESCRIÇÃO SEMANAL DETALHADA -->
          <section style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid ${primaryColor};">
              <div style="width: 6px; height: 18px; background: ${primaryColor}; border-radius: 3px;"></div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Divisão do Treino Aeróbico por Dia da Semana
              </h3>
            </div>
            ${daysHtml}
          </section>

          <!-- INSTRUÇÕES GERAIS -->
          ${protocol.generalNotes
        ? `
              <section style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid ${primaryColor}; padding: 12px 16px; margin-top: 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #334155; line-height: 1.5; page-break-inside: avoid;">
                <strong style="color: #0f172a;">Orientações Gerais do Treinador:</strong> ${protocol.generalNotes}
              </section>
            `
        : ""}

          <!-- FOOTER COM MARCA E SEGURANÇA -->
          <footer style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #94a3b8; page-break-inside: avoid;">
            <div>
              <strong style="color: #64748b;">${businessName}</strong> • Prescrição oficial de Treinamento Cardiorrespiratório & Teste de Conconi.
            </div>
            <div style="font-weight: 700;">
              DragonCorp Cardio Engine
            </div>
          </footer>
        </div>
      </body>
    </html>
  `;
}
async function shareConconiProtocolAsPdf(protocol, trainerId = "trainer") {
    try {
        const html = await generateConconiProtocolPdfHtml(protocol, trainerId);
        const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
        });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(uri, {
                UTI: ".pdf",
                mimeType: "application/pdf",
                dialogTitle: `${protocol.title} - ${protocol.studentName} - PDF`,
            });
        }
        else {
            react_native_1.Alert.alert("PDF Gerado", `Arquivo salvo em: ${uri}`);
        }
    }
    catch (error) {
        react_native_1.Alert.alert("Erro ao Gerar PDF", error instanceof Error ? error.message : "Não foi possível gerar o PDF do protocolo aeróbio.");
    }
}
