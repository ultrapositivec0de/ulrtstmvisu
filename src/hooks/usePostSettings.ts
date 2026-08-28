import { useState, useEffect } from 'react';
import { TagGroup } from '../types';

export function usePostSettings() {
  // Reward Type: 'SP' (100% Power Up), '50' (50% SBD/STEEM & 50% SP), '0' (Decline Payout)
  const [rewardType, setRewardType] = useState<'SP' | '50' | '0'>(() => {
    return (localStorage.getItem('steem_reward_type') as any) || '50';
  });

  // Remove first H1 title line from Markdown body on publish
  const [removeTitleLine, setRemoveTitleLine] = useState<boolean>(() => {
    return localStorage.getItem('steem_remove_title_line') !== 'false';
  });

  // App identifier / User Agent
  const [appAgent, setAppAgent] = useState<string>(() => {
    return localStorage.getItem('steem_app_agent') || 'ultrasteemeditor/4.7.5';
  });

  // Beneficiaries list & inputs
  const [beneficiaries, setBeneficiaries] = useState<{ account: string; weight: number }[]>([]);
  const [benName, setBenName] = useState<string>('');
  const [benWeight, setBenWeight] = useState<string>('5');

  // UI accordion/toggle states for modals
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showAdvancedPublish, setShowAdvancedPublish] = useState<boolean>(false);

  // Tag Groups
  const [tagGroups, setTagGroups] = useState<TagGroup[]>(() => {
    try {
      const saved = localStorage.getItem('steem_tag_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('steem_reward_type', rewardType);
  }, [rewardType]);

  useEffect(() => {
    localStorage.setItem('steem_remove_title_line', String(removeTitleLine));
  }, [removeTitleLine]);

  useEffect(() => {
    localStorage.setItem('steem_app_agent', appAgent);
  }, [appAgent]);

  useEffect(() => {
    try {
      localStorage.setItem('steem_tag_groups', JSON.stringify(tagGroups));
    } catch (e) {
      console.error('Failed to save tag groups to localStorage:', e);
    }
  }, [tagGroups]);

  return {
    rewardType,
    setRewardType,
    removeTitleLine,
    setRemoveTitleLine,
    appAgent,
    setAppAgent,
    beneficiaries,
    setBeneficiaries,
    benName,
    setBenName,
    benWeight,
    setBenWeight,
    showAdvancedSettings,
    setShowAdvancedSettings,
    showAdvancedPublish,
    setShowAdvancedPublish,
    tagGroups,
    setTagGroups,
  };
}
