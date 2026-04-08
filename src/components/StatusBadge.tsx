import { Chip } from "react-native-paper";
import { useSyncStore } from "../stores/syncStore";

export const StatusBadge = () => {
  const status = useSyncStore((state) => state.status);
  const label = status === "online" ? "Online" : status === "offline" ? "Offline" : "Sincronizando";
  const icon = status === "online" ? "wifi" : status === "offline" ? "wifi-off" : "sync";

  return <Chip compact icon={icon}>{label}</Chip>;
};
