import { supabase } from '../src/services/supabase';

async function checkRaces() {
  console.log('Fetching all races from database...\n');

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('series', { ascending: true })
    .order('round', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} races:\n`);

  // Group by series
  const supercross = data?.filter(r => r.series === 'supercross') || [];
  const motocross = data?.filter(r => r.series === 'motocross') || [];
  const championship = data?.filter(r => r.series === 'championship') || [];

  console.log('=== SUPERCROSS ===');
  console.log(`Total: ${supercross.length} races (should be 17)\n`);
  supercross.forEach(race => {
    console.log(`R${race.round}: ${race.name} - ${race.date} (${race.track_name})`);
  });

  console.log('\n=== MOTOCROSS ===');
  console.log(`Total: ${motocross.length} races\n`);
  motocross.forEach(race => {
    console.log(`R${race.round}: ${race.name} - ${race.date} (${race.track_name})`);
  });

  console.log('\n=== CHAMPIONSHIP ===');
  console.log(`Total: ${championship.length} races\n`);
  championship.forEach(race => {
    console.log(`R${race.round}: ${race.name} - ${race.date} (${race.track_name})`);
  });

  // Check for duplicates
  console.log('\n=== CHECKING FOR DUPLICATES ===');
  const nameCount: Record<string, number> = {};
  data?.forEach(race => {
    const key = `${race.name}-R${race.round}`;
    nameCount[key] = (nameCount[key] || 0) + 1;
  });

  const duplicates = Object.entries(nameCount).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('Found duplicates:');
    duplicates.forEach(([name, count]) => {
      console.log(`  ${name}: ${count} entries`);
    });
  } else {
    console.log('No duplicates found');
  }
}

checkRaces();
