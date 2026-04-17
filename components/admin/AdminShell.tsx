import React from 'react'
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AdminSidebar } from './AdminSidebar'
import type { AdminNavItem } from './AdminNav'

type Props = {
  activeKey: string
  children: React.ReactNode
}

export function AdminShell({ activeKey, children }: Props) {
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  const isWide = width >= 980 && Platform.OS === 'web'

  const handleSelect = (item: AdminNavItem) => {
    if (!item.route) return
    ;(navigation as any).navigate(item.route)
  }

  return (
    <View style={styles.page}>
      {isWide && <AdminSidebar activeKey={activeKey} onSelect={handleSelect} />}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#000000',
  },
})

