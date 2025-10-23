import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  searchPotentialRivals,
  getSuggestedRivals,
  createRivalry,
  RivalProfile,
} from '../services/rivalriesService';
import { useAuth } from '../contexts/AuthContext';

export default function AddRivalScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RivalProfile[]>([]);
  const [suggestedRivals, setSuggestedRivals] = useState<RivalProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);

  useEffect(() => {
    loadSuggestedRivals();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      setShowSuggested(false);
      searchRivals();
    } else {
      setShowSuggested(true);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSuggestedRivals = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const data = await getSuggestedRivals(session.user.id);
      setSuggestedRivals(data);
    } catch (error) {
      console.error('Error loading suggested rivals:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRivals = async () => {
    if (!session?.user?.id || searchQuery.length === 0) return;

    setLoading(true);
    try {
      const data = await searchPotentialRivals(session.user.id, searchQuery);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching rivals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRival = async (rivalId: string, rivalName: string) => {
    if (!session?.user?.id) return;

    Alert.alert(
      'Add Rival',
      `Start a rivalry with ${rivalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            const result = await createRivalry(session.user.id, rivalId);
            if (result.success) {
              Alert.alert('Success', 'Rivalry created!', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to create rivalry');
            }
          },
        },
      ]
    );
  };

  const renderRivalItem = ({ item }: { item: RivalProfile }) => (
    <TouchableOpacity
      style={styles.rivalCard}
      onPress={() => handleAddRival(item.id, item.username)}
    >
      <Image
        source={
          item.avatar_url
            ? { uri: item.avatar_url }
            : require('../../assets/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.rivalInfo}>
        <Text style={styles.rivalName}>{item.username}</Text>
        <Text style={styles.rivalPoints}>{item.total_points} points</Text>
      </View>
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {showSuggested ? (
        <>
          <Text style={styles.emptyTitle}>No Suggestions</Text>
          <Text style={styles.emptyText}>
            Try searching for users by username
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No users found matching "{searchQuery}"
          </Text>
        </>
      )}
    </View>
  );

  const displayData = showSuggested ? suggestedRivals : searchResults;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Rival</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#8e9aaf"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {showSuggested && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested Rivals</Text>
          <Text style={styles.sectionSubtitle}>Users with similar points</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D9FF" />
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderRivalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={displayData.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 28,
    color: '#00D9FF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#12182e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8e9aaf',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flex: 1,
  },
  rivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12182e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  rivalInfo: {
    flex: 1,
  },
  rivalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  rivalPoints: {
    fontSize: 14,
    color: '#8e9aaf',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#0a0e27',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8e9aaf',
    textAlign: 'center',
  },
});
