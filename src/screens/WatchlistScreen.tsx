import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { Loading, ErrorState, EmptyState } from '@/components/StateViews';
import {
  useGetWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation,
} from '@/api/marketApi';
import { colors, font, radius, space } from '@/theme';
import type { ApiError } from '@/types';

export default function WatchlistScreen() {
  const { data, error, isLoading, refetch } = useGetWatchlistQuery();
  const [add, addState] = useAddToWatchlistMutation();
  const [remove] = useRemoveFromWatchlistMutation();
  const [input, setInput] = useState('');

  const onAdd = async () => {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    await add(sym);
    setInput('');
  };

  if (isLoading) return <Loading />;
  if (error && !data) return <ErrorState error={error as ApiError} onRetry={refetch} />;

  return (
    <View style={s.screen}>
      <View style={s.addRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add symbol (e.g. FINNIFTY)"
          placeholderTextColor={colors.dim}
          autoCapitalize="characters"
          style={s.input}
        />
        <Pressable onPress={onAdd} disabled={addState.isLoading} style={s.addBtn}>
          <Text style={s.addBtnText}>ADD</Text>
        </Pressable>
      </View>

      {!data?.length ? (
        <EmptyState title="Watchlist empty" hint="Add an index or symbol to track it." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(x) => x}
          contentContainerStyle={{ padding: space.lg }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.symbol}>{item}</Text>
              <Pressable onPress={() => remove(item)} hitSlop={10}>
                <Text style={s.remove}>Remove</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  addRow: { flexDirection: 'row', gap: space.sm, padding: space.lg, paddingBottom: 0 },
  input: {
    flex: 1, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm,
    color: colors.text, fontFamily: font.mono, fontSize: 13,
  },
  addBtn: {
    backgroundColor: colors.blue, borderRadius: radius.sm,
    paddingHorizontal: space.lg, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontFamily: font.sansBold, fontSize: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md, marginBottom: space.sm,
  },
  symbol: { color: colors.text, fontFamily: font.monoBold, fontSize: 14 },
  remove: { color: colors.red, fontSize: 12, fontFamily: font.sans },
});
