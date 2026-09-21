type ScrollFadeProps = {
  position: "top" | "bottom";
  show: boolean;
};

export default function ScrollFade({
  position,
  show,
}: Readonly<ScrollFadeProps>) {
  return (
    <div
      className={`
        pointer-events-none
        absolute
        left-0
        right-0
        h-12
        transition-opacity
        duration-300
        ease-in-out

        ${
          position === "top"
            ? "top-0 bg-gradient-to-b from-zinc-950 to-transparent"
            : "bottom-0 bg-gradient-to-t from-zinc-950 to-transparent"
        }

        ${show ? "opacity-100" : "opacity-0"}
      `}
    />
  );
}