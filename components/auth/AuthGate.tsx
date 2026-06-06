import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontFamily, Spacing } from '@/constants/theme';

interface AuthGateProps {
  children: ReactNode;
}

type AuthStatus = 'checking' | 'authenticated' | 'locked' | 'local';

async function readJsonResponse(response: Response): Promise<{ ok?: boolean; error?: string } | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  return response.json();
}

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (typeof fetch === 'undefined') {
        setStatus('local');
        return;
      }

      try {
        const response = await fetch('/api/session', {
          credentials: 'include',
        });
        const data = await readJsonResponse(response);

        if (!mounted) return;

        if (!data) {
          setStatus('local');
          return;
        }

        setStatus(response.ok && data.ok ? 'authenticated' : 'locked');
        if (response.status === 503 && data.error) {
          setErrorMessage(data.error);
        }
      } catch {
        if (mounted) {
          setStatus('local');
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!password || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      const data = await readJsonResponse(response);

      if (response.ok && data?.ok) {
        setPassword('');
        setStatus('authenticated');
        return;
      }

      setErrorMessage(data?.error ?? '비밀번호를 다시 확인해주세요.');
    } catch {
      setErrorMessage('로그인 서버에 연결할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'authenticated' || status === 'local') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <ThemedText style={styles.title}>비밀번호</ThemedText>
        <TextInput
          accessibilityLabel="비밀번호"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          placeholder="비밀번호 입력"
          placeholderTextColor={Colors.dark.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {errorMessage ? <ThemedText style={styles.error}>{errorMessage}</ThemedText> : null}
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || !password}
          onPress={handleSubmit}
          style={[styles.button, { opacity: isSubmitting || !password ? 0.55 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>{isSubmitting ? '확인 중' : '들어가기'}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
    padding: Spacing.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.surfaceElevated,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: FontFamily.bold,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.text,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
  },
  error: {
    color: Colors.dark.error,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.accent,
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
});
