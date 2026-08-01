import logoColor from "@/assets/mercadopago-logo.svg";
import logoWhite from "@/assets/mercadopago-logo-white.svg";

/**
 * Logo oficial do Mercado Pago (versão horizontal).
 * Colorida no tema light, negativa (branca) no tema dark.
 * Nunca distorcer nem recolorir — altura definida, largura automática.
 */
export function MercadoPagoLogo({ height = 24 }: { height?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center" style={{ height }}>
      <img
        src={logoColor}
        alt="Mercado Pago"
        style={{ height }}
        className="w-auto dark:hidden"
      />
      <img
        src={logoWhite}
        alt="Mercado Pago"
        style={{ height }}
        className="hidden w-auto dark:block"
      />
    </span>
  );
}
