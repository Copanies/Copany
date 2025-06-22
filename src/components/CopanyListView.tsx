import { Copany } from "@/app/database.types";

interface CopanyListViewProps {
  copanies: Copany[];
}

/**
 * Copany 列表视图组件 - 纯渲染组件
 */
export default function CopanyListView({ copanies }: CopanyListViewProps) {
  return (
    <ul className="space-y-6">
      {copanies.map((copany) => (
        <li key={copany.id} className="space-y-2">
          <div className="cursor-pointer">
            <div className="font-medium text-lg">{copany.name}</div>
          </div>
          <div className="">{copany.description}</div>
          <div className="text-sm">ID: {copany.id}</div>
          <div className="text-sm">
            github_url:
            <a
              href={copany.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline ml-1"
            >
              {copany.github_url}
            </a>
          </div>
          <div className="text-sm">created_at: {copany.created_at}</div>
          <div className="text-sm">updated_at: {copany.updated_at}</div>
          <div className="text-sm">created_by: {copany.created_by}</div>
        </li>
      ))}
    </ul>
  );
}
