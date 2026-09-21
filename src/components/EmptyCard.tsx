type EmptyStateCardProps = {
  message: string;
};

export default function EmptyStateCard({
  message,
}: Readonly<EmptyStateCardProps>) {
  return (
    <div
      className="
        border
        border-zinc-800
        rounded
        p-4
        bg-zinc-900
        text-center
        text-zinc-500
      "
    >
      {message}
    </div>
  );
}