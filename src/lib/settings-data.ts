/** Estado mockado das configurações — sem backend nesta etapa. */

export type MpStatus = "nao_configurado" | "conectado" | "requer_atencao";
export type MpEnvironment = "sandbox" | "producao";

export interface MpIntegrationState {
  status: MpStatus;
  environment: MpEnvironment;
  lastValidation: string | null;
  /** Últimos dígitos do Access Token salvo, por ambiente. */
  accessTokenTail: Record<MpEnvironment, string | null>;
  publicKey: Record<MpEnvironment, string>;
  webhookSecretTail: string | null;
  validatedSteps: number[];
}

export const mpIntegrationMock: MpIntegrationState = {
  status: "nao_configurado",
  environment: "sandbox",
  lastValidation: null,
  accessTokenTail: { sandbox: null, producao: null },
  publicKey: { sandbox: "", producao: "" },
  webhookSecretTail: null,
  validatedSteps: [],
};

export const organizationMock = {
  name: "TicketFlow Produções",
  email: "contato@ticketflow.com",
  phone: "(11) 99999-0000",
  logoUrl: "",
};

export const preferencesMock = {
  unifiedCheckinPdf: true,
};

export function environmentLabel(env: MpEnvironment) {
  return env === "producao" ? "Produção" : "Sandbox";
}
