import type { ActiveClientRecord } from "../../features/relationships/queries";

type ActiveClientsTableProps = {
  clients: ActiveClientRecord[];
};

export function ActiveClientsTable({ clients }: ActiveClientsTableProps) {
  if (clients.length === 0) {
    return (
      <section>
        <h2>Active Clients</h2>
        <p>No active clients yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Active Clients</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Client</th>
            <th align="left">Email</th>
            <th align="left">Linked</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.full_name}</td>
              <td>{client.email}</td>
              <td>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(client.linked_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}