/**
 * dsh-ui-repair — host half.
 *
 * Deliberately empty. Every fix this plugin makes is a CSS rule applied on the
 * client half; there is no route, no service, no filesystem access. Keeping the
 * host side inert means the plugin cannot fail a boot or hold a resource.
 *
 * @module dsh-ui-repair
 */

/** Plugin name, also the Loader id used by the bundle patch. */
export const name = "ui-repair";

/** No host services required. */
export const inject = [];

/**
 * Nothing to mount on the host.
 * @returns {void}
 */
export function apply() {}
