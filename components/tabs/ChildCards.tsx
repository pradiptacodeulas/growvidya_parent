import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View, 
  Dimensions 
} from 'react-native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';

// Define the Props interface for TypeScript
interface DashboardCardProps {
  innerText: string;
  color: string;
  iconName: string;
  iconFamily?: 'AntDesign' | 'FontAwesome';
  onPress?: () => void;
}

const { width } = Dimensions.get('window');
// Calculate card width for 2 columns with padding
const CARD_WIDTH = (width - 45) / 2; 

import { useAppTheme } from '@/theme';

const ChildCards: React.FC<DashboardCardProps> = ({ 
  innerText, 
  color, 
  iconName, 
  iconFamily = 'AntDesign',
  onPress 
}) => {
  const { colors, isDark } = useAppTheme();

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.cardBg, 
          borderColor: colors.border,
          borderBottomColor: color + (isDark ? "80" : "50"),
        }
      ]} 
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + (isDark ? "25" : "12") }]}>
        {iconFamily === 'FontAwesome' ? (
          <FontAwesome name={iconName as any} size={20} color={color} />
        ) : (
          <AntDesign name={iconName as any} size={20} color={color} />
        )}
      </View>
      <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={1}>
        {innerText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderBottomWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
});

export default ChildCards;