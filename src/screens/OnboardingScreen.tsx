import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WealthIllustration } from '@/design/icons';
import { PrimaryButton, Screen } from '@/components/ui/Layout';
import { useAppDispatch } from '@/store';
import { onboardingCompleted } from '@/store/settingsSlice';
import { saveOnboarded } from '@/services/secureStorage';
import { ui, gap, radii } from '@/design/tokens';
import { DISCLAIMER } from '@/config';

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();

  const onContinue = async () => {
    dispatch(onboardingCompleted());
    await saveOnboarded(true);
  };

  return (
    <Screen>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.card}>
          <View style={s.art}>
            <WealthIllustration width={300} height={210} />
          </View>

          <View style={s.copy}>
            <Text style={s.title}>Building Wealth{'\n'}Together</Text>
            <Text style={s.body}>
              A smarter way to invest — gain confidence, track progress, and build
              wealth over time with tailored insights and expert guidance
            </Text>
          </View>

          <View style={s.footer}>
            <PrimaryButton label="Continue" onPress={onContinue} />
            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </View>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, padding: gap.lg },
  card: {
    flex: 1,
    backgroundColor: ui.card,
    borderRadius: radii.xl,
    padding: gap.xl,
    justifyContent: 'space-between',
  },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { marginBottom: gap.xl },
  title: {
    color: ui.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginBottom: gap.md,
  },
  body: { color: ui.textMuted, fontSize: 15, lineHeight: 23 },
  footer: { flexDirection: 'column' },
  disclaimer: {
    color: ui.textFaint,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: gap.md,
  },
});
