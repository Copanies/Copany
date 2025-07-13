"use client";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CopanyListViewProps {
  copanies: Copany[];
}

/**
 * Copany 列表视图组件 - 纯渲染组件
 */
export default function CopanyListView({ copanies }: CopanyListViewProps) {
  const router = useRouter();
  return (
    <ul className="space-y-6">
      {copanies.map((copany) => (
        <li key={copany.id} className="space-y-2">
          <div
            onClick={() => {
              router.push(`/copany/${copany.id}`);
            }}
            className="cursor-pointer flex flex-col gap-2"
          >
            {copany.organization_avatar_url && (
              <Image
                src={copany.organization_avatar_url}
                alt={"Organization Avatar"}
                className="w-32 h-32 border-1 border-gray-300 dark:border-gray-700"
                width={100}
                height={100}
              />
            )}
            <div className="font-medium text-lg">{copany.name}</div>
          </div>
          <div className="">{copany.description}</div>
          <div className="text-sm">ID: {copany.id}</div>
          <div className="text-sm">
            github_url:
            {copany.github_url ? (
              <a
                href={copany.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline ml-1"
              >
                {copany.github_url}
              </a>
            ) : (
              <span className="ml-1 text-gray-500">Not set</span>
            )}
          </div>
          <div className="text-sm">created_at: {copany.created_at}</div>
          <div className="text-sm">updated_at: {copany.updated_at}</div>
          <div className="text-sm">created_by: {copany.created_by}</div>
        </li>
      ))}
    </ul>
  );
}
