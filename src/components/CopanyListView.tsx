import { createClient } from "@supabase/supabase-js";
import { Copany } from "@/app/database.types";

const supabaseUrl = "https://zqvuwncemjsdjxudqkpt.supabase.co";
function getSupabaseClient() {
  const supabaseKey = process.env.SUPABASE_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

async function getCopanies(): Promise<Copany[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("copany").select("*");

  if (error) {
    console.error("Error fetching copanies:", error);
    return [];
  }

  return data as Copany[];
}

export default async function CopanyListView() {
  const copanies = await getCopanies();

  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}
