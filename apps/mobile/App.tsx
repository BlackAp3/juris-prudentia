import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BottomNav } from "./src/components";
import {
  CaseDetailScreen,
  CasesScreen,
  CommunityScreen,
  CourseScreen,
  HomeScreen,
  LibraryScreen,
  LoginScreen,
  NewQuestionScreen,
  NotificationsScreen,
  OnboardingScreen,
  ProfileScreen,
  ProgressScreen,
  RegisterScreen,
  SearchScreen,
  ThreadScreen,
  TopicScreen,
  WelcomeScreen,
} from "./src/screens";
import { colors } from "./src/theme";
import { restoreSession } from "./src/api";

export type ScreenKey =
  | "welcome"
  | "login"
  | "register"
  | "onboarding"
  | "home"
  | "library"
  | "course"
  | "topic"
  | "cases"
  | "caseDetail"
  | "community"
  | "thread"
  | "newQuestion"
  | "progress"
  | "notifications"
  | "search"
  | "profile";

const rootScreens: ScreenKey[] = ["home", "library", "progress", "community", "profile"];

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>("welcome");
  const [history, setHistory] = useState<ScreenKey[]>([]);

  useEffect(() => {
    void restoreSession().then((restored) => {
      if (restored) setScreen("home");
    });
  }, []);

  const navigate = (next: ScreenKey) => {
    setHistory((items) => [...items, screen]);
    setScreen(next);
  };

  const goBack = () => {
    const previous = history.at(-1) ?? "home";
    setHistory((items) => items.slice(0, -1));
    setScreen(previous);
  };

  const goRoot = (next: ScreenKey) => {
    setHistory([]);
    setScreen(next);
  };

  const screens: Record<ScreenKey, React.ReactNode> = {
    welcome: <WelcomeScreen navigate={navigate} />,
    login: <LoginScreen navigate={navigate} goBack={goBack} />,
    register: <RegisterScreen navigate={navigate} goBack={goBack} />,
    onboarding: <OnboardingScreen navigate={goRoot} />,
    home: <HomeScreen navigate={navigate} />,
    library: <LibraryScreen navigate={navigate} />,
    course: <CourseScreen navigate={navigate} goBack={goBack} />,
    topic: <TopicScreen navigate={navigate} goBack={goBack} />,
    cases: <CasesScreen navigate={navigate} goBack={goBack} />,
    caseDetail: <CaseDetailScreen goBack={goBack} />,
    community: <CommunityScreen navigate={navigate} />,
    thread: <ThreadScreen goBack={goBack} />,
    newQuestion: <NewQuestionScreen goBack={goBack} />,
    progress: <ProgressScreen navigate={navigate} />,
    notifications: <NotificationsScreen goBack={goBack} />,
    search: <SearchScreen navigate={navigate} goBack={goBack} />,
    profile: <ProfileScreen />,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>{screens[screen]}</View>
      {rootScreens.includes(screen) && <View pointerEvents="none" style={styles.bottomBackdrop} />}
      {rootScreens.includes(screen) && <BottomNav active={screen} navigate={goRoot} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  screen: { flex: 1 },
  bottomBackdrop: { position: "absolute", left: 0, right: 0, bottom: 0, height: 96, backgroundColor: colors.paper, zIndex: 1 },
});
