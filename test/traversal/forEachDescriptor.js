import forEachDescriptor from '../../src/traversal/forEachDescriptor';

let mockComponents, mockVariations;

jest.mock('../../src/helpers/getComponents', () => jest.fn(() => mockComponents));
jest.mock('../../src/helpers/getVariations', () => jest.fn(() => mockVariations));

describe('forEachDescriptor', () => {
  beforeEach(() => {
    mockComponents = {
      'path/to/component': { actualPath: 'path/to/component.js', Module: {} },
    };
    mockVariations = {
      'path/to/VariationProvider': jest.fn(),
    };
    require('../../src/helpers/getComponents').mockClear();
    require('../../src/helpers/getVariations').mockClear();
    mockComponents = {
      'path/to/component': { actualPath: 'path/to/component.js', Module: {} },
    };
    mockVariations = {
      'path/to/VariationProvider': jest.fn(),
    };
  });

  it('is a function', () => {
    expect(typeof forEachDescriptor).toBe('function');
  });

  const mockProjectConfig = {
    components: 'glob/path/to/components',
    variations: 'glob/path/to/variations',
  };

  it('throws when `getDescriptor` is not a 1 or 2 arg function', () => {
    [null, true, false, 42, '', [], {}].forEach((nonFunction) => {
      expect(() => forEachDescriptor(mockProjectConfig, { getDescriptor: nonFunction })).toThrow(TypeError);
    });

    expect(() => forEachDescriptor(mockProjectConfig, { getDescriptor() {} })).toThrow(TypeError);
    expect(() => forEachDescriptor(mockProjectConfig, { getDescriptor(a, b, c) {} })).toThrow(TypeError);
  });

  it('returns a function', () => {
    const traverse = forEachDescriptor(mockProjectConfig);
    expect(typeof traverse).toBe('function');
  });

  it('calls `getComponents` and `getVariations`', () => {
    const getComponents = require('../../src/helpers/getComponents');
    const getVariations = require('../../src/helpers/getVariations');

    forEachDescriptor(mockProjectConfig);

    expect(getComponents).toHaveBeenCalledTimes(1);
    expect(getComponents).toHaveBeenCalledWith(mockProjectConfig, expect.any(String));

    expect(getVariations).toHaveBeenCalledTimes(1);
    expect(getVariations).toHaveBeenCalledWith(mockProjectConfig, expect.any(String));
  });

  describe('traversal function', () => {
    const projectRoot = 'some root';
    const descriptor = {};
    let getExtras, getDescriptor;
    beforeEach(() => {
      getExtras = jest.fn();
      getDescriptor = jest.fn((x) => descriptor);
    });

    it('throws when `callback` is not a 1-arg function', () => {
      const traverse = forEachDescriptor(mockProjectConfig, {
        getExtras,
        getDescriptor,
        projectRoot,
      });

      [null, true, false, 42, '', [], {}].forEach((nonFunction) => {
        expect(() => traverse(nonFunction)).toThrow(TypeError);
      });

      expect(() => traverse(() => {})).toThrow(TypeError);
      expect(() => traverse((a) => {})).not.toThrow(TypeError);
      expect(() => traverse((a, b) => {})).not.toThrow(TypeError);
      expect(() => traverse((a, b, c) => {})).toThrow(TypeError);
    });

    it('throws with no components', () => {
      mockComponents = {};
      expect(() => forEachDescriptor(mockProjectConfig, {
        getExtras,
        getDescriptor,
        projectRoot,
      })).toThrow(RangeError);
    });

    it('throws with no variations', () => {
      mockVariations = {};
      expect(() => forEachDescriptor(mockProjectConfig, {
        getExtras,
        getDescriptor,
        projectRoot,
      })).toThrow(RangeError);
    });

    it('iterates variations', () => {
      const a = jest.fn();
      const b = jest.fn();
      const variationPathA = 'path/to/a';
      const variationPathB = 'path/to/b';
      mockVariations = {
        [variationPathA]: a,
        [variationPathB]: b,
      };
      const traverse = forEachDescriptor(mockProjectConfig, {
        getExtras,
        getDescriptor,
        projectRoot,
      });

      const Components = require('../../src/helpers/getComponents')();
      const variations = require('../../src/helpers/getVariations')();

      const callback = jest.fn((x) => {});
      traverse(callback);

      expect(getDescriptor).toHaveBeenCalledTimes(2);
      const [firstDescriptorArgs, secondDescriptorArgs] = getDescriptor.mock.calls;
      expect(firstDescriptorArgs).toEqual([
        a,
        expect.objectContaining({
          projectConfig: mockProjectConfig,
          Components,
          variations,
          getExtras,
        }),
      ]);
      expect(secondDescriptorArgs).toEqual([
        b,
        expect.objectContaining({
          projectConfig: mockProjectConfig,
          Components,
          variations,
          getExtras,
        }),
      ]);

      expect(callback).toHaveBeenCalledTimes(2);
      const [first, second] = callback.mock.calls;
      expect(first).toEqual([descriptor, { variationPath: variationPathA }]);
      expect(second).toEqual([descriptor, { variationPath: variationPathB }]);
    });

    it('throws when the provider is not a function', () => {
      mockVariations = { 'path/to/a': true };
      const traverse = forEachDescriptor(mockProjectConfig, {
        getExtras,
        getDescriptor,
        projectRoot,
      });

      const callback = jest.fn((x) => {});
      expect(() => traverse(callback)).toThrow(TypeError);
    });

    it('provides a default `getExtras`', () => {
      const a = jest.fn();
      mockVariations = { 'path/to/a': a };
      const traverse = forEachDescriptor(mockProjectConfig, {
        getDescriptor,
        projectRoot,
      });

      const callback = jest.fn((x) => {});
      traverse(callback);

      expect(getDescriptor).toHaveBeenCalledTimes(1);
      const [firstDescriptorArgs] = getDescriptor.mock.calls;
      const [, extras] = firstDescriptorArgs;
      expect(typeof extras.getExtras).toBe('function');
      expect(() => extras.getExtras()).not.toThrow();
    });
  });
});