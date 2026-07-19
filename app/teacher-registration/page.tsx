import TeacherRegistrationClient from "./TeacherRegistrationClient";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherRegistrationData } from "@/lib/teacher-registration-data";

export default async function TeacherRegistrationPage() {
  const user = await getCurrentUser();
  const initialData = await getTeacherRegistrationData(user?.id);

  return <TeacherRegistrationClient initialData={initialData} />;
}
