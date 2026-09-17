import { Redirect, type Href } from "expo-router";

export default function IndexRedirect() {
  return <Redirect href={"/inbox" as Href} />;
}
