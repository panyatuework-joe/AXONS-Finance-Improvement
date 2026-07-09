export function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <p className="stat-card__title">{title}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  );
}
