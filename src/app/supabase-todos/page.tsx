import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Supabase Integration Test (Todos)</h1>
      <ul className="space-y-2">
        {todos?.map((todo: any) => (
          <li key={todo.id} className="p-2 border rounded">
            {todo.name}
          </li>
        ))}
      </ul>
      {(!todos || todos.length === 0) && (
        <p className="text-sm text-slate-500">
          Koneksi Supabase aktif. Belum ada data di tabel &apos;todos&apos;.
        </p>
      )}
    </main>
  );
}
