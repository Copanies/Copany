export default function GithubInstalledLoading() {
  return (
    <div className={`h-screen flex justify-center items-center`}>
      <div className="text-gray-500 dark:text-gray-400">
        Binding GitHub installation
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
