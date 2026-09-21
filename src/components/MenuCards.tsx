type DashboardCardProps = {
  title: string;
  value: string | number;
  className?: string;
};

export default function DashboardCard({
  title,
  value,
  className
}: Readonly<DashboardCardProps>) {
  return (
    <div
      className={`
        bg-zinc-900
        border
        rounded-xl
        p-4
        ${className}
      `}>
      <div className="text-sm text-zinc-500">
        {title}
      </div>

      <div className="text-2xl font-bold mt-2">
        {value}
      </div>
    </div>
  );
}