export default function Logo({ size = "default" }) {
  const textSize = size === "compact" ? "text-[46px]" : "text-[48px]";
  const taglineSize = size === "compact" ? "text-[14px]" : "text-[15px]";

  return (
    <div className="leading-tight">
      <div>
        <span
          className={`font-serif ${textSize} font-semibold leading-none tracking-tight text-[#17233A]`}
        >
          Lia
        </span>
      </div>

      <div className={`mt-1 max-w-[160px] ${taglineSize} leading-5 text-[#17233A]`}>
        Accompagnement pour vos proches, en Suisse.
      </div>
    </div>
  );
}
