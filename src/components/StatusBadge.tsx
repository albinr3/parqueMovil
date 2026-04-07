import { Chip } from "react-native-paper";
import { useSyncStore } from "../stores/syncStore";

export const StatusBadge = () => {
  const status = useSyncStore((state) => state.status);
  const label = status === "online" ? "Online" : status === "offline" ? "Offline" : "Sincronizando";

  return <Chip icon={status === "online" ? "wifi" : "wifi-off"}>{label}</Chip>;
};
