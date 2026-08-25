import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { Badge, Button, Card, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { useRemote } from "./shared";

const dateTime = (value: any) => value ? new Date(value).toLocaleString('en-IN') : 'Not available';

const faqs = [
  { q: 'How do I raise a support request?', a: 'Select Create Support Ticket, choose a category and priority, and describe the issue. The request will appear in your ticket history.' },
  { q: 'Where can I see a reply from INRFS?', a: 'Open a ticket from Ticket History to view the complete conversation and send a follow-up message.' },
  { q: 'Can I reopen a resolved ticket?', a: 'Reply to the resolved ticket with the additional information. Platform support can then reopen it where further action is required.' },
  { q: 'How do I contact support outside the portal?', a: 'Use the verified support email shown on this page. Phone and messaging channels are not displayed until they are officially configured.' },
];

export function SupportScreen() {
  const route = useRoute<any>();
  const loadTickets = useCallback(() => platformApi.support.list({ pageSize: 100 }), []);
  const state = useRemote(loadTickets, { items: [] } as any);
  
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const ticketId = route.params?.ticketId;
    if (!ticketId) return;
    
    const fetchTicket = async () => {
      try {
        const ticket = await platformApi.support.get(ticketId);
        setSelected(ticket);
        setReply('');
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to load ticket.");
      }
    };
    void fetchTicket();
  }, [route.params?.ticketId]);

  const openTicket = async (ticket: any) => {
    try { 
      setSelected(await platformApi.support.get(ticket.id)); 
      setReply(''); 
    } catch (e) { 
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load ticket.");
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) {
      return Alert.alert("Missing Fields", "Subject and description are required.");
    }
    setSubmitting(true);
    try {
      await platformApi.support.create({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim()
      });
      setCreateOpen(false);
      setSubject('');
      setCategory('Technical');
      setDescription('');
      setPriority('Medium');
      await state.refresh();
    } catch (e) {
      Alert.alert("Ticket not created", e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSubmitting(true);
    try { 
      await platformApi.support.message(selected.id, { message: reply.trim(), isInternal: false }); 
      setReply(''); 
      setSelected(await platformApi.support.get(selected.id)); 
      await state.refresh(); 
    } catch (e) { 
      Alert.alert("Failed to send message", e instanceof Error ? e.message : "Error");
    } finally { 
      setSubmitting(false); 
    }
  };
  const renderContactCards = () => (
    <View style={styles.contactGrid}>
      <Card style={styles.contactCard}>
        <View style={[styles.iconWrapper, styles.bgBlue]}>
          <Ionicons name="headset-outline" size={24} color={colors.dark} />
        </View>
        <Text style={styles.contactTitle}>In-platform support</Text>
        <Text style={styles.contactAction}>Create and track tickets</Text>
        <Text style={styles.contactDesc}>Recommended for account and billing issues</Text>
      </Card>

      <Card style={styles.contactCard}>
        <View style={[styles.iconWrapper, styles.bgPurple]}>
          <Ionicons name="send-outline" size={24} color={colors.purple} />
        </View>
        <Text style={styles.contactTitle}>Email support</Text>
        <Text style={styles.contactAction} onPress={() => Linking.openURL('mailto:support@inrfs.in')}>support@inrfs.in</Text>
        <Text style={styles.contactDesc}>Use your registered organization email</Text>
      </Card>
    </View>
  );

  const renderFaqs = () => (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={styles.sectionHeading}>FREQUENTLY ASKED QUESTIONS</Text>
      <View style={styles.faqList}>
        {faqs.map((faq, index) => {
          const isOpen = openFaqIndex === index;
          return (
            <View key={index} style={styles.faqItem}>
              <Pressable 
                style={styles.faqQuestion} 
                onPress={() => setOpenFaqIndex(isOpen ? -1 : index)}
                accessibilityState={{ expanded: isOpen }}
              >
                <Text style={styles.faqQuestionText}>{faq.q}</Text>
                <Ionicons name={isOpen ? "close" : "add"} size={20} color={colors.dark} />
              </Pressable>
              {isOpen && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.a}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const tickets = pageItems(state.data);

  return (
    <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <Header 
        title="Help & Support" 
        subtitle="Create a request and keep the complete conversation in one place." 
      />
      
      <Button 
        label="Create Support Ticket" 
        icon="add" 
        onPress={() => setCreateOpen(true)} 
        style={{ marginBottom: spacing.xl }}
      />

      <FlatList
        data={tickets}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionHeading}>QUICK SUPPORT</Text>
            {renderContactCards()}
            {renderFaqs()}
            <Text style={styles.sectionHeading}>TICKET HISTORY</Text>
            
            {state.loading && (
              <View style={{ gap: spacing.md }}>
                <Card style={[styles.skeletonCard, { height: 120 }]}><ActivityIndicator color={colors.cyan} /></Card>
                <Card style={[styles.skeletonCard, { height: 120 }]}><ActivityIndicator color={colors.cyan} /></Card>
              </View>
            )}

            {state.error ? (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{state.error}</Text>
                <Button label="Try again" variant="secondary" onPress={() => void state.refresh()} style={{ marginTop: 10 }} />
              </Card>
            ) : null}

            {!state.loading && !state.error && tickets.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={{ marginBottom: 10 }}><Ionicons name="chatbubbles-outline" size={32} color={colors.muted} /></View>
                <Text style={styles.emptyTitle}>No support tickets yet</Text>
                <Text style={styles.emptyDesc}>Create a ticket when you need assistance.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void openTicket(item)} style={({ pressed }) => [styles.ticketCard, pressed && styles.ticketCardPressed]}>
            <View style={styles.ticketTopRow}>
              <Text style={styles.ticketId}>{item.ticketNumber || item.id}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.ticketSubject}>{item.subject}</Text>
            <View style={styles.ticketBottomRow}>
              <Text style={styles.ticketMeta}>{item.category} · {item.priority}</Text>
              <Text style={styles.ticketDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : ''}</Text>
            </View>
            <Text style={styles.viewConversation}>View conversation &rarr;</Text>
          </Pressable>
        )}
      />

      {/* CREATE TICKET MODAL */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView style={styles.modalScreen} edges={["top", "bottom"]}>
          <Header 
            title="Create Support Ticket" 
            action={
              <Pressable onPress={() => setCreateOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.dark} />
              </Pressable>
            }
          />
          <ScrollView contentContainerStyle={styles.formContainer}>
            <Field 
              label="Ticket Subject" 
              value={subject} 
              onChangeText={setSubject} 
              placeholder="What do you need help with?"
              maxLength={200}
            />
            <Text style={styles.label}>Category</Text>
            <Segmented 
              options={["Technical", "Billing", "Feature Request", "Account"]} 
              value={category} 
              onChange={setCategory} 
            />
            <Text style={styles.label}>Priority</Text>
            <Segmented 
              options={["Low", "Medium", "High", "Critical"]} 
              value={priority} 
              onChange={setPriority} 
            />
            <Field 
              label="Description" 
              value={description} 
              onChangeText={setDescription} 
              placeholder="Describe your issue in detail..."
              multiline
              maxLength={4000}
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            
            <View style={{ marginTop: 20 }}>
              <Button 
                label={submitting ? "Submitting..." : "Submit Ticket"} 
                onPress={() => void handleCreate()} 
                loading={submitting} 
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* TICKET DETAILS MODAL */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.modalScreen} edges={["top"]}>
          {selected && (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.ticketDetailHeader}>
                <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color={colors.dark} />
                  <Text style={styles.backText}>Support Ticket</Text>
                </Pressable>
              </View>
              
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.detailTicketId}>{selected.ticketNumber || selected.id}</Text>
                <Text style={styles.detailSubject}>{selected.subject}</Text>
                
                <View style={styles.detailMetaRow}>
                  <Badge status={selected.status} />
                  <Text style={styles.detailMetaText}>{selected.category}</Text>
                  <Text style={styles.detailMetaText}>{selected.priority}</Text>
                </View>

                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>YOUR REQUEST</Text>
                <Text style={styles.requestBody}>{selected.description}</Text>
                <Text style={styles.requestDate}>{dateTime(selected.createdAt)}</Text>

                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>CONVERSATION</Text>
                
                <View style={styles.conversationList}>
                  {(() => {
                    const publicMessages = (selected.messages || []).filter((item: any) => !item.isInternal);
                    if (publicMessages.length === 0) {
                      return <Text style={styles.noReplies}>No replies yet.</Text>;
                    }
                    return publicMessages.map((item: any) => {
                      const isUser = item.senderId === selected.openedBy;
                      return (
                        <View key={item.id} style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
                          <Text style={styles.messageSender}>{isUser ? 'Your team' : 'INRFS support'}</Text>
                          <Text style={styles.messageText}>{item.message}</Text>
                          <Text style={styles.messageDate}>{dateTime(item.createdAt)}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>

                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>FOLLOW-UP MESSAGE</Text>
                
                <TextInput 
                  style={styles.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Type your message..."
                  multiline
                  maxLength={4000}
                  textAlignVertical="top"
                />
                
                <Button 
                  label={submitting ? "Sending..." : "Send Message"} 
                  onPress={() => void sendReply()} 
                  disabled={!reply.trim() || submitting}
                  loading={submitting}
                  style={{ marginTop: 16 }}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 10,
  },
  contactGrid: {
    gap: 16,
    marginBottom: spacing.xl,
  },
  contactCard: {
    padding: 20,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bgBlue: { backgroundColor: 'rgba(7, 29, 67, 0.1)' },
  bgPurple: { backgroundColor: 'rgba(125, 31, 232, 0.12)' },
  contactTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
    marginBottom: 4,
  },
  contactAction: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.cyan,
    marginBottom: 6,
  },
  contactDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.dark,
    paddingRight: 10,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#ffffff',
  },
  faqAnswerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  ticketCardPressed: {
    backgroundColor: '#f7fbfd',
    borderColor: '#9ed7e9',
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketId: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.cyan,
  },
  ticketSubject: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.dark,
    marginBottom: 8,
  },
  ticketBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  ticketDate: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  viewConversation: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.cyan,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeBtn: {
    padding: 5,
  },
  formContainer: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.dark,
    marginBottom: -8,
  },
  ticketDetailHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.dark,
  },
  detailTicketId: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.cyan,
    marginBottom: 4,
  },
  detailSubject: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.dark,
    marginBottom: 12,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailMetaText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    backgroundColor: '#f1f5f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  requestBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 22,
    marginBottom: 8,
  },
  requestDate: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  conversationList: {
    gap: 12,
  },
  messageBubble: {
    padding: 16,
    borderRadius: radii.md,
  },
  userBubble: {
    backgroundColor: '#f1f7fa',
  },
  supportBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageSender: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.dark,
    marginBottom: 6,
  },
  messageText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: 8,
  },
  messageDate: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  noReplies: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
    minHeight: 110,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.dark,
    backgroundColor: '#ffffff',
  },
  skeletonCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#a61b29',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  }
});
