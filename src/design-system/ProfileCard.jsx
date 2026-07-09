import ownerAvatar from '../assets/owner-avatar.png';

export function ProfileCard({ role, name }) {
  return (
    <div className="profile-card">
      <div className="profile-card__avatar">
        <img src={ownerAvatar} alt={`${name} avatar`} />
      </div>
      <div className="profile-card__text">
        <p className="profile-card__role">{role}</p>
        <p className="profile-card__name">{name}</p>
      </div>
    </div>
  );
}
