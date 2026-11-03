import { Redirect } from "expo-router";
import { useAppSelector } from "@/redux/hooks";

export default function Index() {
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return null;
  }

  return <Redirect href={isAuthenticated ? "/(main)/(tabs)" : "/(auth)/signin"} />;
}
