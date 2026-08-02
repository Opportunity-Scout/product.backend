import { SearchPreferences } from '@app/modules/searchProfile/domain/SearchPreferences';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

describe('SearchProfile', () => {
  const validPreferences = (): SearchPreferences => {
    const result = SearchPreferences.create({ location: { remote: true, relocation: false } });
    if (result.isFailure) {
      throw result.error;
    }
    return result.value;
  };

  it('creates a search profile with active status by default', () => {
    const result = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('active');
    expect(result.value.name).toBe('Backend Prague');
    expect(result.value.lastMatchedAt).toBeNull();
  });

  it('rejects a blank name', () => {
    const result = SearchProfile.create({
      userId: 'user-1',
      name: '   ',
      preferences: validPreferences(),
    });

    expect(result.isFailure).toBe(true);
  });

  it('trims surrounding whitespace from the name', () => {
    const result = SearchProfile.create({
      userId: 'user-1',
      name: '  Backend Prague  ',
      preferences: validPreferences(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Backend Prague');
  });

  it('defaults description to null when omitted', () => {
    const result = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBeNull();
  });

  it('keeps the provided description', () => {
    const result = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      preferences: validPreferences(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBe('Remote-friendly backend roles');
  });

  it('reconstitutes a search profile from trusted, already-valid props', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const props = {
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      status: 'paused' as const,
      preferences: validPreferences(),
      createdAt: now,
      updatedAt: now,
      lastMatchedAt: now,
    };

    const profile = SearchProfile.reconstitute(props);

    expect(profile.id).toBe('existing-id');
    expect(profile.userId).toBe('user-1');
    expect(profile.name).toBe('Backend Prague');
    expect(profile.description).toBe('Remote-friendly backend roles');
    expect(profile.status).toBe('paused');
    expect(profile.preferences).toBe(props.preferences);
    expect(profile.createdAt).toBe(now);
    expect(profile.updatedAt).toBe(now);
    expect(profile.lastMatchedAt).toBe(now);
  });
});
