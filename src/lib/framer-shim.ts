// Stand-in for the "framer" package, so the components written for Framer run as
// plain React. Framer used addPropertyControls to build its settings panel; here
// it records the control definitions on the component, and `withControls` (see
// controls.ts) uses them to turn the saved Framer settings into real props.

export const ControlType = {
    Boolean: "boolean",
    Number: "number",
    String: "string",
    Color: "color",
    Enum: "enum",
    SegmentedEnum: "segmentedenum",
    Array: "array",
    Object: "object",
    File: "file",
    Image: "image",
    ResponsiveImage: "responsiveimage",
    Link: "link",
    Font: "font",
    Transition: "transition",
    ComponentInstance: "componentinstance",
    EventHandler: "eventhandler",
    Padding: "padding",
    BorderRadius: "borderradius",
    FusedNumber: "fusednumber",
    Date: "date",
    Slot: "slot",
    Border: "border",
    BoxShadow: "boxshadow",
    Cursor: "cursor",
    Gap: "gap",
    TrackingId: "trackingid",
    Vector: "vector",
    VectorSet: "vectorset",
    PageScope: "pagescope",
    Location: "location",
    CollectionReference: "collectionreference",
    MultiCollectionReference: "multicollectionreference",
} as const

export function addPropertyControls(component: any, controls: Record<string, any>) {
    if (component) component.__controls = { ...(component.__controls || {}), ...controls }
}

// The site is always "live", never Framer's canvas or a thumbnail render.
export const RenderTarget = {
    canvas: "CANVAS",
    export: "EXPORT",
    thumbnail: "THUMBNAIL",
    preview: "PREVIEW",
    current: () => "PREVIEW",
    hasRestrictions: () => false,
}

export const useIsStaticRenderer = () => false
export const useIsOnFramerCanvas = () => false
