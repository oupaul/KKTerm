import type { Connection, ConnectionTree } from "../../../types";

export const PANORAMA_CONFIRM_NEW_SESSION_THRESHOLD = 10;

export function shouldConfirmPanorama(newSessionCount: number) {
  return newSessionCount > PANORAMA_CONFIRM_NEW_SESSION_THRESHOLD;
}

export function unopenedPanoramaConnections(
  connections: Connection[],
  isOpen: (connectionId: string) => boolean,
) {
  return connections.filter((connection) => !isOpen(connection.id));
}

export function resolvePanoramaConnections(tree: ConnectionTree, connectionIds: string[]) {
  const wanted = new Set(connectionIds);
  const resolved = new Map<string, Connection>();
  const visit = (branch: ConnectionTree) => {
    for (const connection of branch.connections) {
      if (wanted.has(connection.id)) {
        resolved.set(connection.id, connection);
      }
    }
    for (const folder of branch.folders) {
      visit(folder);
    }
  };
  visit(tree);
  return connectionIds.flatMap((id) => {
    const connection = resolved.get(id);
    return connection ? [connection] : [];
  });
}
