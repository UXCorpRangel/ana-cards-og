export interface VNode {
  type: string
  props: {
    [key: string]:
      | string
      | number
      | boolean
      | VNode
      | VNode[]
      | undefined
      | { [key: string]: string }
    children?: VNode | VNode[] | string
  }
  key?: string
}
