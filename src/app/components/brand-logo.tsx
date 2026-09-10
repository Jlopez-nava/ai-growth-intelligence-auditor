type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, inverse = false, className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}${inverse ? " brand-lockup--inverse" : ""}${className ? ` ${className}` : ""}`}>
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <b />
      </span>
      {!compact ? (
        <span className="brand-wordmark">
          <strong>growth intelligence</strong>
          <small>DEMO</small>
        </span>
      ) : null}
    </span>
  );
}
