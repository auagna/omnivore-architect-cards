import { useRef, useEffect } from "react";
import type { Slide as SlideType, TextField } from "./types";

/** Convert design-px-at-720-canvas → cqw so text scales with slide size */
const cq = (px: number) => `${(px / 720) * 100}cqw`;

type Props = {
  slide: SlideType;
  selectedField: string | null;
  onSelectField: (key: string | null) => void;
  onUpdateField: (key: string, value: string) => void;
  onUpdateNotesItem: (idx: number, value: string) => void;
  onUpdateCalendarMarker?: (day: number | null, label: string) => void;
};

function EditableText({
  field,
  fieldKey,
  className,
  selected,
  onSelect,
  onChange,
}: {
  field: TextField;
  fieldKey: string;
  className?: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep the DOM in sync only when value changes externally (not while typing)
  useEffect(() => {
    if (ref.current && ref.current.innerText !== field.value) {
      ref.current.innerText = field.value;
    }
  }, [field.value]);

  return (
    <div
      ref={ref}
      className={`txt ${className ?? ""}`}
      data-key={fieldKey}
      data-selected={selected || undefined}
      contentEditable
      suppressContentEditableWarning
      onFocus={onSelect}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerText)}
      onBlur={(e) => onChange((e.currentTarget as HTMLDivElement).innerText)}
      style={{ fontSize: cq(field.size) }}
    >
      {field.value}
    </div>
  );
}

export default function Slide({
  slide,
  selectedField,
  onSelectField,
  onUpdateField,
  onUpdateNotesItem,
}: Props) {
  const f = slide.fields;
  const isSel = (k: string) => selectedField === k;

  const renderLogos = (hideTop = false) => (
    <>
      {!hideTop && (
        <div className="logo-top">
          <img src="/oa-logo.png" alt="Omnivore Architect" />
        </div>
      )}
      <div className="logo-bottom">
        <div className="pixel" />
        <div>Omnivore Architect</div>
      </div>
    </>
  );

  const bgStyle = slide.bgImage
    ? { backgroundImage: `url(${slide.bgImage})` }
    : undefined;

  return (
    <div
      className={`slide tpl-${slide.template}`}
      onClick={() => onSelectField(null)}
    >
      {bgStyle && <div className="bg" style={bgStyle} />}

      {slide.template === "cover" && (
        <>
          {renderLogos(true)}
          <div className="content">
            <EditableText
              fieldKey="quarter"
              field={f.quarter}
              className="quarter"
              selected={isSel("quarter")}
              onSelect={() => onSelectField("quarter")}
              onChange={(v) => onUpdateField("quarter", v)}
            />
            <EditableText
              fieldKey="month"
              field={f.month}
              className="month"
              selected={isSel("month")}
              onSelect={() => onSelectField("month")}
              onChange={(v) => onUpdateField("month", v)}
            />
            <EditableText
              fieldKey="title"
              field={f.title}
              className="title-main"
              selected={isSel("title")}
              onSelect={() => onSelectField("title")}
              onChange={(v) => onUpdateField("title", v)}
            />
          </div>
        </>
      )}

      {slide.template === "info" && (
        <>
          {renderLogos()}
          <div className="content">
            <div className="card">
              <EditableText
                fieldKey="place"
                field={f.place}
                className="place"
                selected={isSel("place")}
                onSelect={() => onSelectField("place")}
                onChange={(v) => onUpdateField("place", v)}
              />
              <EditableText
                fieldKey="when"
                field={f.when}
                className="when"
                selected={isSel("when")}
                onSelect={() => onSelectField("when")}
                onChange={(v) => onUpdateField("when", v)}
              />
              <EditableText
                fieldKey="desc"
                field={f.desc}
                className="desc"
                selected={isSel("desc")}
                onSelect={() => onSelectField("desc")}
                onChange={(v) => onUpdateField("desc", v)}
              />
            </div>
          </div>
        </>
      )}

      {slide.template === "exhibition" && (
        <>
          {renderLogos()}
          <div className="content">
            <div
              className="ex-image"
              style={{
                backgroundImage: f.image?.value ? `url(${f.image.value})` : undefined,
                background: !f.image?.value ? "#5dff5d" : undefined,
              }}
            />
            <div className="ex-text">
              <EditableText
                fieldKey="label"
                field={f.label}
                className="ex-label"
                selected={isSel("label")}
                onSelect={() => onSelectField("label")}
                onChange={(v) => onUpdateField("label", v)}
              />
              <EditableText
                fieldKey="title"
                field={f.title}
                className="ex-title"
                selected={isSel("title")}
                onSelect={() => onSelectField("title")}
                onChange={(v) => onUpdateField("title", v)}
              />
              <EditableText
                fieldKey="body"
                field={f.body}
                className="ex-body"
                selected={isSel("body")}
                onSelect={() => onSelectField("body")}
                onChange={(v) => onUpdateField("body", v)}
              />
              <div className="ex-foot">
                <div>
                  <EditableText
                    fieldKey="footLabel1"
                    field={f.footLabel1}
                    className="label"
                    selected={isSel("footLabel1")}
                    onSelect={() => onSelectField("footLabel1")}
                    onChange={(v) => onUpdateField("footLabel1", v)}
                  />
                  <EditableText
                    fieldKey="footValue1"
                    field={f.footValue1}
                    selected={isSel("footValue1")}
                    onSelect={() => onSelectField("footValue1")}
                    onChange={(v) => onUpdateField("footValue1", v)}
                  />
                </div>
                <div>
                  <EditableText
                    fieldKey="footLabel2"
                    field={f.footLabel2}
                    className="label"
                    selected={isSel("footLabel2")}
                    onSelect={() => onSelectField("footLabel2")}
                    onChange={(v) => onUpdateField("footLabel2", v)}
                  />
                  <EditableText
                    fieldKey="footValue2"
                    field={f.footValue2}
                    selected={isSel("footValue2")}
                    onSelect={() => onSelectField("footValue2")}
                    onChange={(v) => onUpdateField("footValue2", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {slide.template === "calendar" && (
        <>
          {renderLogos()}
          <div className="content">
            <EditableText
              fieldKey="title"
              field={f.title}
              className="cal-title"
              selected={isSel("title")}
              onSelect={() => onSelectField("title")}
              onChange={(v) => onUpdateField("title", v)}
            />
            <div className="cal-card">
              <div className="cal-grid">
                {slide.calendar?.headers.map((h, i) => (
                  <div
                    key={`h${i}`}
                    className="head"
                    style={{ fontSize: cq(30) }}
                  >
                    {h}
                  </div>
                ))}
                {slide.calendar?.grid.map((d, i) => (
                  <div
                    key={`d${i}`}
                    className="day"
                    style={{ fontSize: cq(36) }}
                  >
                    {d && slide.calendar?.marker?.day === d ? (
                      <>
                        <span className="marker">{d}</span>
                        {slide.calendar?.marker?.label && (
                          <span className="marker-label">
                            {slide.calendar.marker.label}
                          </span>
                        )}
                      </>
                    ) : d !== null ? (
                      d
                    ) : (
                      ""
                    )}
                  </div>
                ))}
              </div>
              <EditableText
                fieldKey="foot"
                field={f.foot}
                className="cal-foot"
                selected={isSel("foot")}
                onSelect={() => onSelectField("foot")}
                onChange={(v) => onUpdateField("foot", v)}
              />
            </div>
          </div>
        </>
      )}

      {slide.template === "notes" && (
        <>
          {renderLogos()}
          <div className="content">
            <div className="notes-card">
              <EditableText
                fieldKey="title"
                field={f.title}
                className="notes-title"
                selected={isSel("title")}
                onSelect={() => onSelectField("title")}
                onChange={(v) => onUpdateField("title", v)}
              />
              <div className="notes-list">
                {slide.notesItems?.map((item, idx) => (
                  <div className="notes-item" key={idx}>
                    <div className="num" style={{ fontSize: cq(item.size) }}>
                      {idx + 1}.
                    </div>
                    <EditableText
                      fieldKey={`notes-${idx}`}
                      field={item}
                      selected={isSel(`notes-${idx}`)}
                      onSelect={() => onSelectField(`notes-${idx}`)}
                      onChange={(v) => onUpdateNotesItem(idx, v)}
                    />
                  </div>
                ))}
              </div>
              <EditableText
                fieldKey="closing"
                field={f.closing}
                className="closing"
                selected={isSel("closing")}
                onSelect={() => onSelectField("closing")}
                onChange={(v) => onUpdateField("closing", v)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
