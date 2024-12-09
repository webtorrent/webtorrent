/**
 * Examples:
 * existing: 1-10 | 1-10
 * new_item: 8-12 | 10-15
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's lower end is intersecting with the existing item
 */
export function isLowerIntersecting(newItem: MinimalSelectionItem, existing: MinimalSelectionItem): boolean;
/**
 * Examples:
 * existing: 20-25 | 20-25
 * new_item: 15-22 | 15-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's upper end is intersecting with the existing item
 */
export function isUpperIntersecting(newItem: MinimalSelectionItem, existing: MinimalSelectionItem): boolean;
/**
 * Examples:
 * existing: 10-20 | 10-20 | 10-20
 * new_item: 12-15 | 20-20 | 15-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item is completely inside the existing item
 */
export function isInsideExisting(newItem: MinimalSelectionItem, existing: MinimalSelectionItem): boolean;
/**
 * Examples:
 * existing: 10-20 | 10-20 | 10-20
 * new_item: 10-21 | 09-20 | 10-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item is covering the existing item
 */
export function isCoveringExisting(newItem: MinimalSelectionItem, existing: MinimalSelectionItem): boolean;
/**
 * @typedef {Object} MinimalSelectionItem
 * @property {number} from
 * @property {number} to
 */
/** A selection of pieces to download.
 * @typedef {MinimalSelectionItem & {
 *  offset: number,
 *  priority: number,
 *  notify?: function
 *  isStreamSelection?: boolean
 * }} SelectionItem
 */
/**
 * @typedef {MinimalSelectionItem & {notify: function}} NotificationItem
 */
export class Selections {
    /** @type {Array<SelectionItem>} */
    _items: Array<SelectionItem>;
    /**
     * @param {MinimalSelectionItem & {isStreamSelection?: boolean}} item Interval to be removed from the selection
     */
    remove(item: MinimalSelectionItem & {
        isStreamSelection?: boolean;
    }): void;
    /**
     * @param {SelectionItem & NotificationItem} newItem
     */
    insert(newItem: SelectionItem & NotificationItem): void;
    /** @param {(a: SelectionItem, b: SelectionItem) => number} sortFn */
    sort(sortFn?: (a: SelectionItem, b: SelectionItem) => number): void;
    get length(): number;
    /**  @param {number} index */
    get(index: number): SelectionItem;
    swap(i: any, j: any): void;
    clear(): void;
    /** @returns {Generator<SelectionItem & {remove: () => void, replaceWith: (MinimalSelectionItem[]) => void}>} */
    [Symbol.iterator](): Generator<SelectionItem & {
        remove: () => void;
        replaceWith: (MinimalSelectionItem[]);
    }>;
}
export function isIntersecting(newItem: any, existing: any): () => boolean;
export type MinimalSelectionItem = {
    from: number;
    to: number;
};
/**
 * A selection of pieces to download.
 */
export type SelectionItem = MinimalSelectionItem & {
    offset: number;
    priority: number;
    notify?: Function;
    isStreamSelection?: boolean;
};
export type NotificationItem = MinimalSelectionItem & {
    notify: Function;
};
//# sourceMappingURL=selections.d.ts.map