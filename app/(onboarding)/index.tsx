import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import { ChoiceCard } from '@/features/onboarding/components/choice-card';
import {
  EXPERIENCE_OPTIONS,
  SEX_OPTIONS,
  TRAINING_DAY_OPTIONS,
  validateAge,
} from '@/features/onboarding/options';
import { useProfile } from '@/features/profile/context';
import type { ExperienceLevel, Sex } from '@/features/profile/types';
import { colors } from '@/theme';

/**
 * Onboarding — the four plan-generation inputs (tasks 5.1, 5.2, 5.5).
 *
 * One question per step rather than a single scrolling form. These four values
 * are the only things the generator knows about the user, and a stepped flow
 * makes that weight visible; a four-field form invites rushing. It also gives
 * each experience band room for the helper text task 5.2 requires.
 *
 * Unit preference is deliberately **not** here. It is a display preference,
 * not a plan input, and the template is explicit that the two must stay
 * separate. It lives in Settings (task 5.3).
 *
 * Nothing is written until the final step: a half-saved profile is a state the
 * rest of the app does not understand, and onboarding would appear complete
 * the moment the last field happened to land.
 */

const STEPS = ['age', 'experience', 'sex', 'days'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { profile, savePlanInputs } = useProfile();

  const [stepIndex, setStepIndex] = useState(0);
  // Pre-filled when re-onboarding (task 5.4), empty on first run.
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [ageError, setAgeError] = useState<string>();
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    profile?.experienceLevel ?? null,
  );
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [days, setDays] = useState<number | null>(profile?.trainingDaysPerWeek ?? null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const step: Step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const canAdvance =
    step === 'age'
      ? age.trim().length > 0
      : step === 'experience'
        ? experience !== null
        : step === 'sex'
          ? sex !== null
          : days !== null;

  async function handleNext() {
    setSaveError(undefined);

    if (step === 'age') {
      const result = validateAge(age);
      if (result.error) {
        setAgeError(result.error);
        return;
      }
      setAgeError(undefined);
    }

    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }

    const validAge = validateAge(age);
    if (!validAge.value || !experience || !sex || !days) {
      setSaveError('Something is missing. Go back and check your answers.');
      return;
    }

    setSaving(true);
    try {
      await savePlanInputs({
        age: validAge.value,
        experienceLevel: experience,
        sex,
        trainingDaysPerWeek: days,
      });
      // No navigation: the profile now reports onboarding complete and the
      // routing in app/_layout.tsx moves the user into the app.
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={screenStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.progress, { marginTop: insets.top + 16 }]}>
        {STEPS.map((name, index) => (
          <View
            key={name}
            style={[styles.progressBar, index <= stepIndex && styles.progressBarFilled]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {step === 'age' ? (
          <StepBody
            title="How old are you?"
            subtitle="Nash's programming adapts with age — it is one of the four things your plan is built from."
          >
            <TextField
              label="Age"
              value={age}
              onChangeText={(next) => {
                setAge(next);
                setAgeError(undefined);
              }}
              error={ageError}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={3}
              editable={!saving}
            />
          </StepBody>
        ) : null}

        {step === 'experience' ? (
          <StepBody
            title="How long have you been training?"
            subtitle="Be honest rather than generous — this drives your split, volume and rep ranges."
          >
            {EXPERIENCE_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                label={option.label}
                helper={option.helper}
                selected={experience === option.value}
                onPress={() => setExperience(option.value)}
              />
            ))}
          </StepBody>
        ) : null}

        {step === 'sex' ? (
          <StepBody title="Sex" subtitle="Used by Nash's adjustment rules.">
            {SEX_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                label={option.label}
                selected={sex === option.value}
                onPress={() => setSex(option.value)}
              />
            ))}
          </StepBody>
        ) : null}

        {step === 'days' ? (
          <StepBody
            title="How many days a week can you train?"
            subtitle="This sets the shape of your split. Choose what you can hold to, not what you hope for."
          >
            {TRAINING_DAY_OPTIONS.map((option) => (
              <ChoiceCard
                key={option}
                label={`${option} days`}
                selected={days === option}
                onPress={() => setDays(option)}
              />
            ))}
          </StepBody>
        ) : null}

        {saveError ? (
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          label={isLastStep ? 'Create my plan' : 'Continue'}
          onPress={handleNext}
          disabled={!canAdvance}
          loading={saving}
        />
        {stepIndex > 0 ? (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStepIndex((index) => index - 1)}
            disabled={saving}
          />
        ) : null}

        {/* Task 1.8. The only way out of onboarding for someone who signed up
            and changed their mind: these screens have no tab bar and no sign
            out, so without this an account created here is unreachable and
            undeletable. Apple guideline 5.1.1(v) asks for deletion to be
            available to anyone with an account, which includes this user.
            Understated on purpose — it is an exit, not an option. */}
        <Pressable
          onPress={() => router.push('/account/delete')}
          disabled={saving}
          accessibilityRole="button"
          hitSlop={12}
          style={styles.exit}
        >
          <Text variant="caption" color="textMuted">
            Delete my account
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepBody({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.heading}>
        <Text variant="display">{title}</Text>
        <Text color="textSecondary">{subtitle}</Text>
      </View>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surface2,
  },
  progressBarFilled: {
    backgroundColor: colors.brandRed,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  step: {
    gap: 28,
  },
  heading: {
    gap: 10,
  },
  options: {
    gap: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  exit: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
});
