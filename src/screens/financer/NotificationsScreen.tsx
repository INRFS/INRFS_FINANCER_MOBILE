import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "../../components/AppIcon";
import { Button, Segmented, Screen } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { colors, fonts, spacing, radii, shadows } from "../../theme/tokens";

export function NotificationsScreen() {
  const navigation = useNavigation<any>();

  const load = useCallback(() => platformApi.notifications.all(), []);
  const state = useRemote(load, { items: [] } as any);
  
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Payments",
    "Loans",
    "Overdue",
    "Support",
    "Service Charges",
    "System",
  ];

  const items = useMemo(() => {
    return pageItems(state.data).map((notification: any) => ({
      ...notification,
      category: notification.category || notification.type || "System",
      isRead: notification.isRead ?? Boolean(notification.readAt),
    }));
  }, [state.data]);

  const filtered = useMemo(() => {
    return items.filter(
      (notification: any) =>
        activeCategory === "All" ||
        notification.category === activeCategory
    );
  }, [items, activeCategory]);

  const [busyMarkAll, setBusyMarkAll] = useState(false);

  const handleMarkAllRead = async () => {
    setBusyMarkAll(true);
    try {
      await platformApi.notifications.readAll();
      await state.refresh();
      // On web we'd dispatch a window event, but this is React Native.
      // If the app relies on a global context, it will refetch based on navigation focus or similar.
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to mark all as read");
    } finally {
      setBusyMarkAll(false);
    }
  };
  const handleNotification = async (item: any) => {
    const id = item.id;
    if (!item.isRead) {
      try {
        await platformApi.notifications.read(id);
        await state.refresh();
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to mark as read");
        return; // Don't navigate if read fails
      }
    }

    if (item.entityType === 'SupportTicket' && item.entityId) {
      navigation.navigate("Support", { ticketId: item.entityId });
    } else if (item.entityType === 'Payment' && item.entityId) {
      navigation.navigate("Payments");
    } else if (item.entityType === 'PaymentSchedule' && item.entityId) {
      navigation.navigate("Due / Overdue");
    } else if (item.entityType === 'ServiceChargeInvoice' && item.entityId) {
      navigation.navigate("Service Charge");
    }
  };

  const getIconData = (category: string) => {
    switch (category) {
      case "Overdue":
        return { name: "alert-circle-outline", color: colors.error, bg: colors.errorSoft };
      case "Payments":
        return { name: "checkmark-done-circle-outline", color: colors.green, bg: colors.greenSoft };
      case "Loans":
        return { name: "cash-outline", color: colors.cyan, bg: colors.cyanSoft };
      case "System":
        return { name: "refresh-outline", color: colors.subtle, bg: "#F1F5F9" };
      case "Support":
        return { name: "chatbubble-ellipses-outline", color: colors.purple, bg: colors.purpleSoft };
      case "Service Charges":
        return { name: "receipt-outline", color: colors.orange, bg: colors.orangeSoft };
      default:
        return { name: "notifications-outline", color: colors.muted, bg: "#F1F5F9" };
    }
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return timeStr;
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    
    if (isYesterday) return `Yesterday, ${timeStr}`;
    
    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Alerts for due payments, loan approvals and system updates.</Text>
        </View>
        <Button 
          label="Mark all read" 
          variant="ghost" 
          icon="checkmark-done-outline" 
          onPress={handleMarkAllRead} 
          loading={busyMarkAll}
          style={styles.markAllBtn}
        />
      </View>

      <View style={styles.tabsContainer}>
        <Segmented 
          options={categories} 
          value={activeCategory} 
          onChange={setActiveCategory} 
        />
      </View>

      <RemoteState {...state} retry={() => void state.refresh()} />

      <View style={styles.list}>
        {state.loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={colors.cyan} />
            <Text style={styles.emptyText}>Loading notifications...</Text>
          </View>
        ) : filtered.length === 0 && !state.error ? (
          <View style={styles.emptyContainer}>
            <View style={{ marginBottom: 12 }}>
              <Ionicons name="notifications-outline" size={32} color={colors.subtle} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>There are no notifications in this category.</Text>
          </View>
        ) : (
          filtered.map((item: any) => {
            const iconData = getIconData(item.category);
            
            return (
              <Pressable 
                key={item.id} 
                onPress={() => handleNotification(item)}
                style={({ pressed }) => [
                  styles.card,
                  !item.isRead && styles.cardUnread,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: iconData.bg }]}>
                  <Ionicons name={iconData.name as any} size={20} color={iconData.color} />
                </View>

                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.time, !item.isRead && styles.timeUnread]}>
                      {formatDate(item.createdAt || item.date)}
                    </Text>
                  </View>
                  <Text style={styles.message}>
                    {item.message}
                  </Text>
                </View>

                {!item.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  headerTextContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    color: colors.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  markAllBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
  tabsContainer: {
    marginBottom: spacing.xl,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardUnread: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderLeftColor: colors.cyan,
    paddingLeft: 13, // Adjust for the 4px border to keep alignment
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.dark,
  },
  cardTitleUnread: {
    fontFamily: fonts.bold,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.subtle,
    flexShrink: 0,
    marginTop: 2,
  },
  timeUnread: {
    color: colors.muted,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
