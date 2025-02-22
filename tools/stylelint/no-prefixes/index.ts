import {createPlugin, utils} from 'stylelint';
import minimatch from 'minimatch';
import {NeedsPrefix} from './needs-prefix';

const parseSelector = require('stylelint/lib/utils/parseSelector');
const ruleName = 'material/no-prefixes';
const messages = utils.ruleMessages(ruleName, {
  property: (property: string, browsers: string[]) => {
    return `Unprefixed property "${property}" needs a prefix for browsers ${browsers.join(', ')}.`;
  },
  value: (property, value) => `Unprefixed value in "${property}: ${value}".`,
  atRule: name => `Unprefixed @rule "${name}".`,
  mediaFeature: value => `Unprefixed media feature "${value}".`,
  selector: selector => `Unprefixed selector "${selector}".`
});

/** Config options for the rule. */
interface RuleOptions {
  browsers: string[];
  filePattern: string;
}

/**
 * Stylelint plugin that warns for unprefixed CSS.
 */
const plugin = createPlugin(ruleName, (isEnabled: boolean, _options?) => {
  return (root, result) => {
    if (!isEnabled) {
      return;
    }

    const options = _options as RuleOptions;
    const {browsers, filePattern} = options;

    if (filePattern && !minimatch(root.source!.input.file!, filePattern)) {
      return;
    }

    const needsPrefix = new NeedsPrefix(browsers);

    // Check all of the `property: value` pairs.
    root.walkDecls(decl => {
      const propertyPrefixes = needsPrefix.property(decl.prop, decl.value);

      if (propertyPrefixes.length) {
        utils.report({
          result,
          ruleName,
          message: messages.property(decl.prop, propertyPrefixes),
          node: decl,
          index: (decl.raws.before || '').length
        });
      } else if (needsPrefix.value(decl.prop, decl.value)) {
        utils.report({
          result,
          ruleName,
          message: messages.value(decl.prop, decl.value),
          node: decl,
          index: (decl.raws.before || '').length
        });
      }
    });

    // Check all of the @-rules and their values.
    root.walkAtRules(rule => {
      if (needsPrefix.atRule(rule.name)) {
        utils.report({
          result,
          ruleName,
          message: messages.atRule(rule.name),
          node: rule
        });
      } else if (needsPrefix.mediaFeature(rule.params)) {
        utils.report({
          result,
          ruleName,
          message: messages.mediaFeature(rule.name),
          node: rule
        });
      }
    });

    // Walk the rules and check if the selector needs prefixes.
    root.walkRules(rule => {
      // Silence warnings for Sass selectors. Stylelint does this in their own rules as well:
      // https://github.com/stylelint/stylelint/blob/master/lib/utils/isStandardSyntaxSelector.js
      parseSelector(rule.selector, { warn: () => {} }, rule, (selectorTree: any) => {
        selectorTree.walkPseudos((pseudoNode: any) => {
          if (needsPrefix.selector(pseudoNode.value)) {
            utils.report({
              result,
              ruleName,
              message: messages.selector(pseudoNode.value),
              node: rule,
              index: (rule.raws.before || '').length + pseudoNode.sourceIndex,
            });
          }
        });
      });
    });

  };
});


plugin.ruleName = ruleName;
plugin.messages = messages;
export default plugin;
