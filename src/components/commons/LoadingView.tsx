export default function LoadingView({
  type = "page",
  label = "Loading",
}: {
  type?: "page" | "label";
  label?: string;
}) {
  return (
    <div
      className={`${
        type === "page" ? "h-screen" : "h-full"
      } flex justify-center items-center`}
    >
      <div className="text-gray-500 dark:text-gray-400">
        Loading
        <span className="inline-block">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
            .
          </span>
          <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
            .
          </span>
        </span>
      </div>
    </div>
  );
}
