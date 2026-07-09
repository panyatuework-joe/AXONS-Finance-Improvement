import { DesignType, Badge, ProfileCard, StatCard } from '../design-system';
import logoBg from '../assets/logo-bg.svg';
import vectorDecor from '../assets/vector-decor.svg';

export function Cover() {
  return (
    <section className="cover">
      <img className="cover__logo-bg" src={logoBg} alt="Logo background" />
      <div className="cover__vector-wrapper">
        <img className="cover__vector" src={vectorDecor} alt="Decorative vector" />
      </div>
      <div className="cover__blur" />

      <div className="cover__content">
        <div className="cover__top-row">
          <DesignType />
        </div>
        <h1 className="cover__title">AXONS FINANCE [GL]</h1>
        <Badge label="Website" />
      </div>

      <ProfileCard role="Owner" name="Joe" />

      <div className="cover__stats">
        <StatCard title="Squad" value="STARLORD" />
        <StatCard title="Team" value="Back Office & Finance" />
      </div>
    </section>
  );
}
