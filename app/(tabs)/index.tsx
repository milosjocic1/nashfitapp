import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { useAuth } from '@/features/auth/context';
import { signOut } from '@/features/auth/sign-in';
import { EXPERIENCE_OPTIONS } from '@/features/onboarding/options';
import { useProfile } from '@/features/profile/context';
import type { UnitPreference } from '@/features/profile/types';
import { colors, radius } from '@/theme';

/**
 * Settings (tasks 5.3, 5.4, 1.6).
 *
 * Deliberately presents plan inputs and preferences as **two separate
 * sections**, because they behave differently and the user should be able to
 * tell: editing an input means a new plan, editing a preference changes only
 * what is displayed. The onboarding template's design rule, made visible.
 *
 * Replaces the debug placeholder that stood here through Phase 0.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { profile, saveUnitPreference, unitLocked } = useProfile();
  const [savingUnit, setSavingUnit] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const experienceLabel = EXPERIENCE_OPTIONS.find(
    (option) => option.value === profile?.experienceLevel,
  )?.label;

  async function handleUnitChange(unit: UnitPreference) {
    if (unit === profile?.unitPreference || unitLocked) {
      return;
    }
    setSavingUnit(true);
    try {
      await saveUnitPreference(unit);
    } finally {
      setSavingUnit(false);
    }
  }

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Text variant="display">Settings</Text>

      {/* --- Plan inputs ---------------------------------------------- */}
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text variant="h2">Your plan inputs</Text>
          <Text variant="caption" color="textMuted">
            These four shape the plan Nash builds for you. Changing them creates a new one.
          </Text>
        </View>

        <View style={styles.card}>
          <Row label="Age" value={profile?.age != null ? `${profile.age}` : '—'} />
          <Divider />
          <Row label="Experience" value={experienceLabel ?? '—'} />
          <Divider />
          <Row
            label="Sex"
            value={profile?.sex ? profile.sex[0].toUpperCase() + profile.sex.slice(1) : '—'}
          />
          <Divider />
          <Row
            label="Training days"
            value={
              profile?.trainingDaysPerWeek != null ? `${profile.trainingDaysPerWeek} per week` : '—'
            }
          />
        </View>

        {/* Task 5.4. Plan regeneration lands with Phase 6; for now this
            updates the inputs, and prior plans stay traceable through their
            own input_snapshot. */}
        <Button
          label="Update my details"
          variant="secondary"
          onPress={() => router.push('/(onboarding)')}
        />
      </View>

      {/* --- Preferences ---------------------------------------------- */}
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text variant="h2">Preferences</Text>
          <Text variant="caption" color="textMuted">
            Display only. Changing these never affects your plan.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.unitRow}>
            <Text variant="label" color="textSecondary">
              Weight units
            </Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lb'] as const).map((unit) => (
                <Button
                  key={unit}
                  label={unit.toUpperCase()}
                  variant={profile?.unitPreference === unit ? 'primary' : 'secondary'}
                  onPress={() => handleUnitChange(unit)}
                  disabled={savingUnit || unitLocked}
                  style={styles.unitButton}
                />
              ))}
            </View>
          </View>
          {/* An explanation, not a silently dead control. The weight is
              stored as entered, so the lock protects existing history. */}
          {unitLocked ? (
            <View style={styles.lockNote}>
              <Text variant="caption" color="textMuted">
                Units are fixed once you have logged a set, because weights are saved exactly as you
                enter them.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* --- Account --------------------------------------------------- */}
      <View style={styles.section}>
        <Text variant="h2">Account</Text>
        <View style={styles.card}>
          <Row label="Signed in as" value={session?.user.email ?? '—'} />
        </View>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={async () => {
            setSigningOut(true);
            await signOut();
          }}
          loading={signingOut}
        />
      </View>

      {/* --- Danger zone ----------------------------------------------- */}
      {/* Last on the screen and visually separated, so it is findable when
          wanted (Apple guideline 5.1.1(v) requires that) without sitting
          next to Sign out, where a mis-tap would be unrecoverable. The
          screen it opens explains the consequences; this is only the door. */}
      <View style={styles.section}>
        <Text variant="h2">Delete account</Text>
        <Text variant="caption" color="textMuted">
          Permanently erases your account and all of your training history.
        </Text>
        <Button
          label="Delete my account"
          variant="secondary"
          onPress={() => router.push('/account/delete')}
          disabled={signingOut}
        />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Text variant="label" numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    gap: 4,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  rowValue: {
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  lockNote: {
    paddingBottom: 14,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    minWidth: 64,
    paddingHorizontal: 12,
  },
});
