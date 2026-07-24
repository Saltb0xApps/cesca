import Link from "next/link";
import Calendar from "../_components/calendar";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Calendar</h1>
        <div className="main-header-right">
          <Link href="/compose" className="btn btn-primary">
            + New post
          </Link>
        </div>
      </div>
      <div className="main-content">
        <Calendar />
      </div>
    </>
  );
}
