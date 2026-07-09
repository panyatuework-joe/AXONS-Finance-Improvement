import figmaCoverA from '../assets/cover-layer-1.png';
import figmaCoverB from '../assets/cover-layer-2.png';

export function DesignType({ className = '' }) {
  return (
    <div className={`design-type ${className}`.trim()}>
      <div className="design-type__icon">
        <div className="design-type__icon-layer design-type__icon-layer--base">
          <img src={figmaCoverA} alt="Design type badge background" />
        </div>
        <div className="design-type__icon-layer design-type__icon-layer--overlay">
          <img src={figmaCoverB} alt="Design type badge overlay" />
        </div>
      </div>
      <p className="design-type__label">Figma</p>
    </div>
  );
}
