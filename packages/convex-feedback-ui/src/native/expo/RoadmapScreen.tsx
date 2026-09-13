import { Stack, useRouter } from "expo-router";

import { mergeFeedbackMessages } from "../../shared/messages.js";
import { mergeFeedbackTheme } from "../../shared/theme.js";
import { RoadmapScreen as NativeRoadmapScreen } from "../shared/ui/RoadmapScreen.js";
import type { RoadmapScreenProps } from "../../shared/types/index.js";
import type {
  RoadmapAndroidToolbarIcons,
  RoadmapStackScreenOptions,
} from "./types.js";

interface RoadmapScreenWithStack {
  /** Enables the current Expo Router stack integration. @default true */
  useStack?: true;
  /** Options applied to the current Expo Router screen. */
  StackOptions?: RoadmapStackScreenOptions;
  /** Android image source for the toolbar back action. */
  androidToolbarIcons?: RoadmapAndroidToolbarIcons;
}

interface RoadmapScreenWithoutStack {
  useStack: false;
  StackOptions?: never;
  androidToolbarIcons?: never;
}

export type ExpoRoadmapScreenProps = RoadmapScreenProps &
  (RoadmapScreenWithStack | RoadmapScreenWithoutStack);

/**
 * Convenience roadmap screen for a single Expo route. Use
 * `RoadmapStackLayout` when the board and item detail should be separate
 * discovered Expo Router pages.
 */
export function RoadmapScreen({
  useStack = true,
  StackOptions,
  androidToolbarIcons = {},
  ...props
}: ExpoRoadmapScreenProps) {
  if (!useStack) return <NativeRoadmapScreen {...props} />;

  const messages = mergeFeedbackMessages(props.messages);
  const theme = mergeFeedbackTheme(props.theme);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: messages.roadmap.title,
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: true,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerTintColor: props.textColor ?? theme.colors.text,
          contentStyle: {
            backgroundColor: props.backgroundColor ?? theme.colors.background,
          },
          ...StackOptions,
        }}
      />
      <RoadmapToolbar
        androidToolbarIcons={androidToolbarIcons}
        messages={messages}
        theme={theme}
      />
      <NativeRoadmapScreen {...props} />
    </>
  );
}

function RoadmapToolbar({
  androidToolbarIcons,
  messages,
  theme,
}: {
  androidToolbarIcons: RoadmapAndroidToolbarIcons;
  messages: ReturnType<typeof mergeFeedbackMessages>;
  theme: ReturnType<typeof mergeFeedbackTheme>;
}) {
  const router = useRouter();

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        hidden={!router.canGoBack()}
        icon={
          process.env.EXPO_OS === "ios"
            ? "chevron.backward"
            : androidToolbarIcons.back
        }
        accessibilityLabel={messages.entry.back}
        onPress={() => router.back()}
        tintColor={theme.colors.text}
      >
        {messages.entry.back}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
