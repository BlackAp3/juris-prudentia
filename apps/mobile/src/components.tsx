import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScreenKey } from "../App";
import { colors } from "./theme";

export function AppHeader({ title, subtitle, goBack, onSearch, onNotifications }: { title?: string; subtitle?: string; goBack?: () => void; onSearch?: () => void; onNotifications?: () => void }) {
  return <View style={styles.header}><View style={styles.headerRow}>
    {goBack ? <TouchableOpacity onPress={goBack} style={styles.headerAction}><Text style={styles.headerIcon}>‹</Text></TouchableOpacity> : <Text style={styles.brandIcon}>⚖</Text>}
    <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.headerTitle}>{title ?? "Juris Prudentia"}</Text>{subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}</View>
    {onSearch && <TouchableOpacity onPress={onSearch} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Search"><Ionicons name="search-outline" size={22} color={colors.white} /></TouchableOpacity>}
    {onNotifications && <TouchableOpacity onPress={onNotifications} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Notifications"><Ionicons name="notifications-outline" size={22} color={colors.white} /><View style={styles.dot} /></TouchableOpacity>}
  </View></View>;
}

export function ScreenScroll({ children, background = colors.paper }: { children: ReactNode; background?: string }) {
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: background }} contentContainerStyle={styles.scroll}>{children}</ScrollView>;
}

export function SearchField({ placeholder = "Search cases, statutes and notes…", value, onChangeText, onFocus }: { placeholder?: string; value?: string; onChangeText?: (value: string) => void; onFocus?: () => void }) {
  return <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.muted} style={styles.searchIcon} /><TextInput value={value} onChangeText={onChangeText} onFocus={onFocus} placeholder={placeholder} placeholderTextColor="#7D8798" style={styles.searchInput} /></View>;
}

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text>{action && <TouchableOpacity onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity>}</View>;
}

export function ProgressBar({ value, color = colors.gold }: { value: number; color?: string }) {
  return <View style={styles.track}><View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} /></View>;
}

export function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "red" | "navy" }) {
  const tones = { gold: [colors.goldSoft, "#8A692B"], green: [colors.successSoft, colors.success], red: [colors.dangerSoft, colors.danger], navy: [colors.navy2, colors.white] } as const;
  return <View style={[styles.pill, { backgroundColor: tones[tone][0] }]}><Text style={[styles.pillText, { color: tones[tone][1] }]}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, light = false }: { label: string; onPress?: () => void; light?: boolean }) {
  return <TouchableOpacity onPress={onPress} style={[styles.button, light && styles.buttonLight]}><Text style={[styles.buttonText, light && styles.buttonLightText]}>{label}</Text></TouchableOpacity>;
}

export function BottomNav({ active, navigate }: { active: ScreenKey; navigate: (screen: ScreenKey) => void }) {
  const items: { key: ScreenKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
    { key: "library", label: "Library", icon: "library-outline", activeIcon: "library" },
    { key: "progress", label: "Progress", icon: "stats-chart-outline", activeIcon: "stats-chart" },
    { key: "community", label: "Community", icon: "people-outline", activeIcon: "people" },
    { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ];
  return <View style={styles.nav}><View style={styles.navBar}>{items.map((item) => { const isActive = active === item.key; return <TouchableOpacity key={item.key} onPress={() => navigate(item.key)} style={[styles.navItem, isActive && styles.navItemActive]} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: isActive }}><Ionicons name={isActive ? item.activeIcon : item.icon} size={22} color={isActive ? colors.navy : "#AEB8C8"} /></TouchableOpacity>; })}</View></View>;
}

const styles = StyleSheet.create({
  header:{backgroundColor:colors.navy,paddingHorizontal:16,paddingTop:12,paddingBottom:14},headerRow:{flexDirection:"row",alignItems:"center",minHeight:46},brandIcon:{fontSize:25,color:colors.gold,marginRight:9},headerCopy:{flex:1},headerTitle:{fontFamily:"serif",fontSize:19,fontWeight:"800",color:colors.white},headerSubtitle:{fontSize:11,color:"#AEB8C8",marginTop:2},headerAction:{width:38,height:38,alignItems:"center",justifyContent:"center",position:"relative"},headerIcon:{fontSize:36,color:colors.white,lineHeight:38},actionGlyph:{fontSize:24,color:colors.white},dot:{position:"absolute",width:7,height:7,borderRadius:4,backgroundColor:colors.gold,right:5,top:5},scroll:{padding:16,paddingBottom:110},search:{height:44,backgroundColor:colors.white,borderRadius:22,borderWidth:1,borderColor:colors.line,flexDirection:"row",alignItems:"center",paddingHorizontal:14},searchIcon:{marginRight:7},searchInput:{flex:1,color:colors.ink,fontSize:14},sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:20,marginBottom:12},sectionTitle:{fontFamily:"serif",fontSize:20,fontWeight:"800",color:colors.ink},sectionAction:{color:"#8C6D30",fontWeight:"700",fontSize:13},track:{height:5,backgroundColor:"#E8ECF2",borderRadius:4,overflow:"hidden"},fill:{height:5,borderRadius:4},pill:{alignSelf:"flex-start",borderRadius:12,paddingHorizontal:9,paddingVertical:4},pillText:{fontSize:10,fontWeight:"800"},button:{backgroundColor:colors.gold,borderRadius:9,minHeight:46,alignItems:"center",justifyContent:"center",paddingHorizontal:18},buttonText:{fontWeight:"900",color:colors.navy},buttonLight:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.line},buttonLightText:{color:colors.navy},nav:{position:"absolute",left:0,right:0,bottom:8,height:84,backgroundColor:"transparent",paddingHorizontal:14,paddingBottom:10,zIndex:10,elevation:10},navBar:{flex:1,backgroundColor:colors.navy2,borderWidth:1,borderColor:colors.navy3,borderRadius:24,flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:5,shadowColor:"#000",shadowOpacity:0.22,shadowRadius:14,shadowOffset:{width:0,height:6}},navItem:{width:55,height:52,borderRadius:18,alignItems:"center",justifyContent:"center"},navItemActive:{backgroundColor:colors.gold},
});
