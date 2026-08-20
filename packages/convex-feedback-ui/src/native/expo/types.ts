import type { StackScreenProps } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import type { FeedbackScreenRootProps } from "../../shared/types";

interface FeedbackScreenWithStack {
  useStack?: true;
  StackOptions?: StackScreenProps["options"];
}
interface FeedbackScreenWithoutStack {
  useStack?: false;
  StackOptions?: never;
}
export type FeedbackScreenStackProps =
  FeedbackScreenWithStack | FeedbackScreenWithoutStack;

export type ExpoFeedbackScreenProps = FeedbackScreenStackProps &
  FeedbackScreenRootProps;

export interface FeedbackStackProps {
  searchRef: React.RefObject<SearchBarCommands | null>;
  stackOptions?: StackScreenProps["options"];
  children: React.ReactNode;
}
