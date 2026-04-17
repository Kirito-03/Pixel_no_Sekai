import React from 'react'
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ADMIN_NAV_ITEMS, type AdminNavItem } from './AdminNav'

type Props = {
  activeKey: string
  onSelect: (item: AdminNavItem) => void
}

export function AdminSidebar({ activeKey, onSelect }: Props) {
  const { width } = useWindowDimensions()
  const isWide = width >= 980 && Platform.OS === 'web'
  if (!isWide) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.brand}>
        <View style={styles.brandDot} />
        <Text style={styles.brandText}>Admin</Text>
      </View>

      <View style={styles.menu}>
        {ADMIN_NAV_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => !item.disabled && item.route && onSelect(item)}
            style={(state: any) => [
              styles.item,
              item.key === activeKey && styles.itemActive,
              item.disabled && styles.itemDisabled,
              state.hovered && !item.disabled && styles.itemHover,
              state.pressed && !item.disabled && styles.itemPressed,
            ]}
          >
            <Ionicons
              name={item.icon as any}
              size={18}
              color={item.key === activeKey ? '#E50914' : item.disabled ? '#374151' : '#9ca3af'}
            />
            <Text
              style={[
                styles.itemText,
                item.key === activeKey && styles.itemTextActive,
                item.disabled && styles.itemTextDisabled,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 260,
    backgroundColor: '#000000',
    borderRightWidth: 1,
    borderRightColor: '#111111',
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E50914',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menu: {
    paddingTop: 12,
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  itemHover: {
    backgroundColor: '#0b0b0b',
    borderColor: '#141414',
  },
  itemPressed: {
    opacity: 0.9,
  },
  itemActive: {
    backgroundColor: '#0b0b0b',
    borderColor: '#1f1f1f',
  },
  itemDisabled: {
    opacity: 0.55,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  itemTextActive: {
    color: '#FFFFFF',
  },
  itemTextDisabled: {
    color: '#6b7280',
  },
})

