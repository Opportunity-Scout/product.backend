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

  it('pauses an active search profile', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.pause();

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('paused');
  });

  it('rejects pausing a search profile that is already paused', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'paused',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.pause();

    expect(result.isFailure).toBe(true);
  });

  it('rejects pausing an archived search profile', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'archived',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.pause();

    expect(result.isFailure).toBe(true);
  });

  it('activates a paused search profile', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'paused',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.activate();

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('active');
  });

  it('rejects activating a search profile that is already active', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.activate();

    expect(result.isFailure).toBe(true);
  });

  it('rejects activating an archived search profile', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'archived',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.activate();

    expect(result.isFailure).toBe(true);
  });

  it('archives an active search profile', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.archive();

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('archived');
  });

  it('archives a paused search profile', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'paused',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.archive();

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('archived');
  });

  it('rejects archiving a search profile that is already archived', () => {
    const profile = SearchProfile.reconstitute({
      id: 'existing-id',
      userId: 'user-1',
      name: 'Backend Prague',
      description: null,
      status: 'archived',
      preferences: validPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMatchedAt: null,
    });

    const result = profile.archive();

    expect(result.isFailure).toBe(true);
  });

  it('leaves the name unchanged when omitted from an update', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({});

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Backend Prague');
  });

  it('updates and trims the name when provided', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({ name: '  Senior Backend Prague  ' });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe('Senior Backend Prague');
  });

  it('rejects updating to a blank name', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({ name: '   ' });

    expect(result.isFailure).toBe(true);
  });

  it('rejects a null name reaching updateDetails outside the validated DTO/HTTP path', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({ name: null as unknown as string });

    expect(result.isFailure).toBe(true);
  });

  it('leaves the description unchanged when omitted from an update', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({});

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBe('Remote-friendly backend roles');
  });

  it('clears the description when explicitly set to null', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({ description: null });

    expect(result.isSuccess).toBe(true);
    expect(result.value.description).toBeNull();
  });

  it('leaves preferences unchanged when omitted from an update', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const result = created.value.updateDetails({});

    expect(result.isSuccess).toBe(true);
    expect(result.value.preferences).toBe(created.value.preferences);
  });

  it('fully replaces preferences when provided', () => {
    const created = SearchProfile.create({
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: validPreferences(),
    });

    if (created.isFailure) {
      throw created.error;
    }

    const newPreferencesResult = SearchPreferences.create({ location: { remote: false, countries: ['CZ'] } });

    if (newPreferencesResult.isFailure) {
      throw newPreferencesResult.error;
    }

    const result = created.value.updateDetails({ preferences: newPreferencesResult.value });

    expect(result.isSuccess).toBe(true);
    expect(result.value.preferences).toBe(newPreferencesResult.value);
  });
});
